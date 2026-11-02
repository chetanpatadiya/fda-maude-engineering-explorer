import {PATHWAYS} from './taxonomy.js';

const NEGATIONS = [
  /\bno\s+(?:evidence\s+of\s+|signs?\s+of\s+|indication\s+of\s+)?$/i,
  /\b(?:not|without|neither|ruled\s+out|unable\s+to\s+confirm|did\s+not\s+observe)\s+(?:\w+\s+){0,3}$/i,
  /\b(?:intact|undamaged)\s+(?:and\s+)?$/i
];
const CONTRADICTORY = /\b(?:package|packaging|pouch|seal|tray|sterile barrier)\s+(?:was\s+|is\s+|remained\s+)?(?:intact|undamaged|not damaged|not compromised)\b/i;

export function getNarratives(record){
  return (Array.isArray(record?.mdr_text) ? record.mdr_text : [])
    .map(x=>String(x?.text ?? '').trim()).filter(Boolean);
}
export function getDeviceSummary(record){
  const d = Array.isArray(record?.device) ? record.device[0] ?? {} : {};
  return {
    productCode: String(d.device_report_product_code ?? d?.openfda?.product_code ?? '—'),
    brand: String(d.brand_name ?? 'Unspecified'),
    manufacturer: String(d.manufacturer_d_name ?? record?.manufacturer_name ?? 'Unspecified'),
    generic: String(d.generic_name ?? 'Unspecified')
  };
}
export function normalizeRecord(record, source='live'){
  const narratives=getNarratives(record);
  const devices=getDeviceSummary(record);
  return {
    id:String(record?.mdr_report_key ?? record?.report_number ?? 'unknown'),
    reportNumber:String(record?.report_number ?? ''),
    date:String(record?.date_received ?? ''),
    eventType:String(record?.event_type ?? 'Unknown'),
    narrative:narratives.join('\n\n'), narratives, ...devices, source,
    raw:record
  };
}
export function classifyRecord(rec, pathwayList=PATHWAYS){
  const text=String(rec?.narrative ?? '');
  const lower=text.toLowerCase();
  const output=[];
  for(const p of pathwayList){
    const matches=[];
    for(const word of p.keywords){
      const needle=word.toLowerCase();
      let start=0;
      for(let n=0;n<12;n++){
        const ix=lower.indexOf(needle,start);
        if(ix===-1)break;
        const prior=text.slice(Math.max(0,ix-75),ix);
        const after=text.slice(ix+needle.length,Math.min(text.length,ix+needle.length+65));
        const negated=NEGATIONS.some(re=>re.test(prior)) ||
          /\b(?:was\s+not|is\s+not|not\s+found|not\s+observed)\b/i.test(after.slice(0,34)) ||
          CONTRADICTORY.test(text.slice(Math.max(0,ix-22),Math.min(text.length,ix+needle.length+35)));
        matches.push({phrase:word,index:ix,negated,context:text.slice(Math.max(0,ix-90),Math.min(text.length,ix+needle.length+115)).replace(/\s+/g,' ').trim()});
        start=ix+needle.length;
      }
    }
    if(matches.length) output.push({pathway:p, matches, cautioned:matches.some(m=>m.negated), matchedTerms:[...new Set(matches.map(m=>m.phrase))]});
  }
  return output;
}
export function summarize(records, lensIds){
  const selected=PATHWAYS.filter(p=>lensIds.includes(p.id));
  const unique = new Map();
  for(const r of records){const n=normalizeRecord(r,r?.__source ?? 'live'); if(!unique.has(n.id))unique.set(n.id,n);}
  const analyzed=[...unique.values()].map(r=>({...r,classified:classifyRecord(r,selected)}));
  const matched=analyzed.filter(r=>r.classified.length);
  return {
    rows:analyzed, matched, loaded:analyzed.length,
    narrativeAvailable:analyzed.filter(r=>r.narrative.trim()).length,
    themeStats:selected.map(p=>({pathway:p,count:matched.filter(r=>r.classified.some(x=>x.pathway.id===p.id)).length})),
    cautioned:matched.filter(r=>r.classified.some(x=>x.cautioned)).length
  };
}
export function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
export function safeCsvCell(value){
  let s=String(value ?? '').replace(/\r?\n/g,' ');
  if(/^[\s]*[=+@-]/.test(s))s="'"+s; // suppress CSV formula injection
  return '"'+s.replace(/"/g,'""')+'"';
}
export function toCsv(rows){
  const head=['MDR Report Key','Report Number','Date Received','Event Type','Product Code','Manufacturer','Device','Pathways','Caution Flags','Narrative Excerpt','Source'];
  const lines=[head.map(safeCsvCell).join(',')];
  for(const r of rows){
    lines.push([r.id,r.reportNumber,r.date,r.eventType,r.productCode,r.manufacturer,r.generic,
      r.classified.map(x=>x.pathway.name).join(' | '), r.classified.some(x=>x.cautioned)?'Potential qualification needed':'',
      r.narrative.slice(0,450),r.source].map(safeCsvCell).join(','));
  }
  return '\ufeff'+lines.join('\r\n');
}
export function fdaRecordUrl(r){
  if(r.source==='demo')return null;
  const url=new URL('https://api.fda.gov/device/event.json');
  if(r.id && r.id !== 'unknown')url.searchParams.set('search',`mdr_report_key:"${r.id.replace(/[^0-9]/g,'')}"`);
  else if(r.reportNumber)url.searchParams.set('search',`report_number:"${r.reportNumber.replace(/[^A-Za-z0-9-]/g,'')}"`);
  else return null;
  url.searchParams.set('limit','1');
  return url.toString();
}
export function generateBrief(summary, query, lens, mode='demo', total=null, queryUrl=null){
  const fmt=n=>Number.isFinite(n)?n.toLocaleString():'not available';
  const lines=[
    '# MAUDE Engineering Investigation Brief — V0.1',
    '',`Generated: ${new Date().toISOString()}`,`Data mode: ${mode==='demo'?'SYNTHETIC DEMONSTRATION — NOT FDA DATA':mode==='import'?'IMPORTED FDA-FORMAT JSON (user-supplied; provenance not verified)':'LIVE openFDA response'}`,
    `Lens: ${lens}`,
    `Cohort criteria: ${JSON.stringify(query)}`,
    `Exact openFDA query URL: ${queryUrl || 'not applicable to demo or imported data'}`,
    `Lexicon version: 0.1.0`,
    `Reports returned in current sample: ${summary.loaded}`,
    `Matched by local dictionary: ${summary.matched.length}`,
    `Narratives available in returned sample: ${summary.narrativeAvailable}`,
    `Potential qualification flags: ${summary.cautioned}`,
    `API cohort match total (if supplied): ${fmt(total)}`,
    '', '## Candidate pathways (non-exclusive, matched within sampled reports)',
    ...summary.themeStats.map(s=>`- ${s.pathway.name}: ${s.count} reports; **not a verified failure count**`),
    '', '## Engineering questions and potential follow-up',
    ...summary.themeStats.filter(x=>x.count).flatMap(s=>[`### ${s.pathway.name}`,`Question: ${s.pathway.question}`,`Investigation option: ${s.pathway.investigation}`,'']),
    '## Example traceable report evidence (up to 15)',
    ...summary.matched.slice(0,15).flatMap(r=>[
      `### ${r.reportNumber||r.id} | ${r.eventType} | ${r.date}`,
      `Device: ${r.generic}; product code: ${r.productCode}`,
      `Pathways: ${r.classified.map(c=>c.pathway.name).join('; ')}`,
      `Observed lexical evidence: ${r.classified.flatMap(c=>c.matches).slice(0,4).map(m=>'“'+m.context+'”'+(m.negated?' [CAUTION]':'')).join(' | ')}`,
      `FDA API record: ${fdaRecordUrl(r) ?? 'Synthetic demonstration record — no FDA link'}`,'']),
    '## Interpretation boundaries',
    '- MAUDE is a passive reporting system; report counts do not establish occurrence rates, comparative safety, or causal attribution.',
    '- Keyword evidence is a screening hypothesis only; negation detection is incomplete and requires human adjudication.',
    '- Data may contain incomplete narratives, supplements, repeated reports, and multiple devices. This prototype deduplicates only by MDR report key in the returned sample.',
    '- This client loads at most the selected result limit and does not claim to inspect every matching MAUDE report.',
    '- All downstream design-control, risk, and validation recommendations require a qualified engineering assessment.',
    '', 'Sources: https://open.fda.gov/apis/device/event/ and https://www.fda.gov/medical-devices/medical-device-reporting-mdr-how-report-medical-device-problems/mdr-data-files'
  ];
  return lines.join('\n');
}
