// Small shared boundary between the existing screen functions and PHP/MySQL.
const DEMO_MODE=location.protocol==='file:' || new URLSearchParams(location.search).get('demo')==='1';
let saving=false,refreshing=false,lastSnapshot='';
let accountGeneration=0,activeRefreshController=null;
function clearAccountData(){
  accountGeneration++;lastSnapshot='';activeRefreshController?.abort();activeRefreshController=null;refreshing=false;
  for(const key of ['clients','transactions','inventory','schedules','negotiations','staff','personnel','weeklyHours','availability','assignments','recommendations','notifications','reviews','inventoryActivity','changes'])state[key]=[];
  state.account=null;state.unreadCount=0;delete state.financial;
  if(typeof closeSearch==='function')closeSearch();
  if(typeof searchOptions!=='undefined')searchOptions=[];
  if(typeof invalidateClientScheduleCache==='function')invalidateClientScheduleCache();
  const modalContent=document.getElementById('modalContent');if(modalContent)modalContent.replaceChildren();
}
const newId=(prefix='')=>prefix+crypto.randomUUID();
function newNumericId(){const parts=crypto.getRandomValues(new Uint32Array(2));return (parts[0]&0x1fffff)*4294967296+parts[1];}
const belongsTo=(record,client)=>Boolean(client && record.clientId!=null && String(record.clientId)===String(client.id));
function jsArg(value){return escapeHtml(JSON.stringify(value));}
function validDecimal(value,min=0,max=1000000){return Number.isFinite(value)&&value>=min&&value<=max&&Math.abs(value*100-Math.round(value*100))<0.00001;}

function normalizeRecords(data){
  const clients=data.clients||[],inventory=data.inventory||[];
  const findClient=name=>clients.find(c=>c.name===name)||(name==='Dela Cruz Interiors'?clients.find(c=>c.email==='mdelacruz@gmail.com'):null);
  for(const key of ['transactions','schedules','negotiations'])for(const row of data[key]||[]){
    if(row.clientId==null){const c=findClient(row.client);if(c)row.clientId=c.id;}
    if(key==='transactions' && !row.items?.length){const p=inventory.find(i=>i.name===row.product);if(p)row.items=[{productId:p.id,product:p.name,quantity:Number(row.quantity),unitPrice:Number(row.unitPrice),unit:p.unit,category:p.category}];}
  }
  return data;
}
function statusMessage(text,error=false){
  let box=document.getElementById('persistenceStatus');
  if(!box){box=document.createElement('div');box.id='persistenceStatus';box.setAttribute('role','status');document.body.prepend(box);}
  box.className=error?'persistence-status is-error':'persistence-status';box.textContent=text;
}
async function apiRequest(path,input,options={}){
  let response,result;
  try{response=await fetch('api/'+path,{method:input?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:options.signal||AbortSignal.timeout(15000),headers:input?{'Content-Type':'application/json'}:{},body:input?JSON.stringify(input):undefined});}
  catch(error){error.kind='network';throw error;}
  try{result=await readClientApiResponse(response,'Portal API');}
  catch(error){error.kind='response';throw error;}
  if(!response.ok || !result.success){const error=new Error(result.message||'The API request failed.');error.kind=result.code==='database_unavailable'?'database':'api';error.status=response.status;throw error;}
  return result;
}
async function refreshDatabase(redraw=false,options={}){
  if(DEMO_MODE || refreshing || saving)return;
  refreshing=true;
  const generation=accountGeneration;
  const controller=new AbortController();activeRefreshController=controller;
  const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(15000),...(options.signal?[options.signal]:[])]);
  try{
    const {data}=await apiRequest('sync.php',null,{...options,signal});
    if(options.signal?.aborted)throw new DOMException('Startup was cancelled.','AbortError');
    if(generation!==accountGeneration)return;
    // Snapshot clock seconds are metadata; they must not reset a report table's
    // scroll position every polling interval when business records are unchanged.
    const signatureData=data.financial?{...data,financial:{...data.financial,asOf:String(data.financial.asOf||'').slice(0,10)}}:data;
    const signature=JSON.stringify(signatureData),changed=signature!==lastSnapshot;
    // Apply identity first: a changed server session must clear the prior account's
    // editor caches before its authorized replacement snapshot is assigned.
    if(typeof applyAccount==='function'&&data.account)applyAccount(data.account);
    lastSnapshot=signature;
    Object.assign(state,normalizeRecords(data));
    recalculateClientStats();invalidateClientScheduleCache();
    statusMessage('Classroom prototype · MySQL connected');
    if(redraw&&changed&&!document.activeElement?.matches('input,textarea,select')&&document.getElementById('modal')?.classList.contains('hidden'))render();
  }catch(error){
    if(generation!==accountGeneration||controller.signal.aborted)return;
    statusMessage((error.kind==='database'?'Database unavailable: ':'Data refresh failed: ')+error.message,true);
    throw error;
  }finally{
    if(activeRefreshController===controller){activeRefreshController=null;refreshing=false;}
  }
}
async function commitChange(action,input,element){
  if(saving)return null;
  const target=element?.currentTarget || document.querySelector('#modalContent form') || document.getElementById('modalContent');
  const signature=JSON.stringify({action,...input});
  if(target && target.dataset.requestSignature!==signature){target.dataset.requestSignature=signature;target.dataset.requestId=newId();}
  const requestId=target?.dataset.requestId||newId();
  saving=true;document.body.classList.add('is-saving');statusMessage('Saving to MySQL…');
  let result;
  try{while(refreshing)await new Promise(resolve=>setTimeout(resolve,25));result=await apiRequest('sync.php',{action,...input,requestId});}
  catch(error){statusMessage('Save failed: '+error.message,true);toast(error.message);return null;}
  finally{saving=false;document.body.classList.remove('is-saving');}
  try{await refreshDatabase();}catch(error){toast('Saved to MySQL. Reload to retrieve the latest data.');}
  if(target){delete target.dataset.requestId;delete target.dataset.requestSignature;}
  return result;
}
function validateDemoSchedule(clientId,date,time,existingId=0){
  if(!date || !time || date+' '+time<todayKey()+' '+new Date().toTimeString().slice(0,5)){toast('Choose a future appointment date and time.');return false;}
  if(state.schedules.some(s=>String(s.clientId)===String(clientId)&&String(s.id)!==String(existingId)&&s.date===date&&s.time===time&&s.status!=='Cancelled')){toast('This client already has an appointment at that time.');return false;}
  return true;
}
setInterval(()=>{
  if(!DEMO_MODE && !saving && !document.hidden && document.getElementById('modal')?.classList.contains('hidden') && !['Splash','Login','Welcome'].includes(state.page))refreshDatabase(true).catch(()=>{});
},15000);
window.addEventListener('focus',()=>{if(!DEMO_MODE&&!saving&&!['Splash','Login','Welcome'].includes(state.page))refreshDatabase(true).catch(()=>{});});
