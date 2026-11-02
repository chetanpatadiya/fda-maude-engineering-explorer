const API='https://api.fda.gov/device/event.json';
export function buildQuery({from,to,productCode='',manufacturer='',keyword='',eventType='',limit=100}){
  const d=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)?s.replaceAll('-',''):null;
  const first=d(from),last=d(to);
  if(!first || !last || first>last)throw Error('Enter a valid date range.');
  if(productCode && !/^[A-Za-z]{3}$/.test(productCode.trim()))throw Error('Product code must be exactly three letters.');
  if(!productCode.trim() && !manufacturer.trim() && !keyword.trim())throw Error('Add a product code, manufacturer, or narrative term to define a searchable cohort.');
  if(!Number.isInteger(Number(limit)) || limit<1 || limit>250)throw Error('Sample limit must be between 1 and 250.');
  const parts=[`date_received:[${first} TO ${last}]`];
  const clean=s=>String(s).trim().replace(/["\\]/g,'').replace(/[^\p{L}\p{N} .,\-_/]/gu,' ').slice(0,90).trim();
  if(productCode.trim())parts.push(`device.device_report_product_code:"${productCode.trim().toUpperCase()}"`);
  if(manufacturer.trim())parts.push(`device.manufacturer_d_name:"${clean(manufacturer)}"`);
  if(keyword.trim())parts.push(`mdr_text.text:"${clean(keyword)}"`);
  if(eventType) {
    if(!['Death','Injury','Malfunction','Other'].includes(eventType))throw Error('Unsupported event type.');
    parts.push(`event_type:"${eventType}"`);
  }
  const url=new URL(API);url.searchParams.set('search',parts.join(' AND '));
  url.searchParams.set('limit',String(limit));
  url.searchParams.set('sort','date_received:desc');
  return url.toString();
}
export async function fetchReports(input,{signal}={}){
  const url=buildQuery(input);
  const response=await fetch(url,{signal,headers:{Accept:'application/json'}});
  const json=await response.json().catch(()=>({}));
  if(!response.ok){
    const detail=json?.error?.message ?? `HTTP ${response.status}`;
    if(response.status===404 || /no matches/i.test(detail))return {records:[],total:0,url};
    throw Error(`openFDA returned ${response.status}: ${detail}`);
  }
  return {records:Array.isArray(json.results)?json.results:[],total:Number.isFinite(json.meta?.results?.total)?json.meta.results.total:null,url};
}
