// Compatibility for the explicitly selected browser-only demo. Connected mode
// never derives financial facts here; it always uses the PHP/MySQL snapshot.
function financialData(){
  if(!DEMO_MODE)return state.financial;
  const today=todayKey(),year=Number(today.slice(0,4)),month=Number(today.slice(5,7));
  const monthly={},categories={},recognized=[],years=new Set([year]);
  let outstanding=0;
  for(const transaction of state.transactions){
    if(transaction.status==='Cancelled')continue;
    years.add(Number(String(transaction.date).slice(0,4)));
    if(transaction.status!=='Paid'){outstanding+=Number(transaction.amount)||0;continue;}
    const key=String(transaction.date).slice(0,7),amount=Number(transaction.amount)||0;
    monthly[key]=(monthly[key]||0)+amount;recognized.push({id:transaction.id,month:key,amount});
    for(const item of transaction.items?.length?transaction.items:[{productId:transaction.productId,product:transaction.product,quantity:transaction.quantity,unitPrice:transaction.unitPrice}]){
      const category=item.category||state.inventory.find(product=>(item.productId!=null?String(product.id)===String(item.productId):product.name===item.product))?.category||'Other';
      categories[key]??={};categories[key][category]=(categories[key][category]||0)+Number(item.quantity)*Number(item.unitPrice);
    }
  }
  const end=new Date(`${today.slice(0,7)}-01T12:00:00`),first=Object.keys(monthly).sort()[0],months={};
  for(let offset=12;offset>=1;offset--){const date=new Date(end.getFullYear(),end.getMonth()-offset,1),key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;if(first&&key>=first)months[key]=monthly[key]||0;}
  const values=Object.values(months),sorted=[...values].sort((a,b)=>a-b),median=sorted[Math.floor((sorted.length-1)/2)]||0,ceiling=values.length>=5&&median>0?median*3:Infinity;
  const model=values.map(value=>Math.min(value,ceiling)),recent=model.slice(-3),next=recent.length===3?Math.round((recent[0]+2*recent[1]+3*recent[2])/6*100)/100:null;
  const errors=[];
  for(let i=3;i<model.length;i++)errors.push(Math.abs(model[i]-(model[i-3]+2*model[i-2]+3*model[i-1])/6));
  if(!errors.length&&next!==null)errors.push(...recent.map(value=>Math.abs(value-next)));
  const spread=errors.length?1.96*errors.reduce((sum,value)=>sum+value,0)/errors.length:0,future=new Date(end.getFullYear(),end.getMonth()+1,1);
  return {year,month,years:[...years].filter(Number.isFinite).sort((a,b)=>a-b),monthly,categories,recognized,outstanding,undatedPaidPayments:0,source:'Offline browser demo: paid totals use transaction dates because payment dates are unavailable.',forecast:{months,monthCount:values.length,partialMonth:today.slice(0,7),forecastMonth:`${future.getFullYear()}-${String(future.getMonth()+1).padStart(2,'0')}`,next,lower:next===null?null:Math.max(0,next-spread),upper:next===null?null:next+spread,cappedMonths:values.filter(value=>value>ceiling).length,average:values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0,method:'Offline browser demonstration using saved transaction dates, not verified payment recognition. Weighted complete-month level estimate (1:2:3), minimum three months; zero months included and model-only spikes capped at three times the median. Connect MySQL for authoritative financial reporting.'}};
}
