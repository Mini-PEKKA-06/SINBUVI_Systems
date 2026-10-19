// The database supplies all recognized revenue and forecast inputs.
let financeSelection={year:null,month:'all'};
function financialPeriod(){
  const data=financialData();
  const year=Number(financeSelection.year||data?.year||new Intl.DateTimeFormat('en',{timeZone:'Asia/Manila',year:'numeric'}).format(new Date()));
  const last=data&&year===data.year?data.month:12;
  return {data,year,last,month:financeSelection.month};
}
function financialReportMetrics(){
  const {data,year,last,month}=financialPeriod();
  const monthly=Array.from({length:last},(_,i)=>Number(data?.monthly?.[`${year}-${String(i+1).padStart(2,'0')}`]||0));
  const keys=month==='all'?monthly.map((_,i)=>`${year}-${String(i+1).padStart(2,'0')}`):[`${year}-${month}`];
  const revenue=keys.reduce((sum,key)=>sum+Number(data?.monthly?.[key]||0),0);
  const categories={};
  for(const key of keys)for(const [name,amount] of Object.entries(data?.categories?.[key]||{}))categories[name]=(categories[name]||0)+Number(amount);
  const categoryTotal=Object.values(categories).reduce((sum,value)=>sum+value,0);
  const count=(data?.recognized||[]).filter(row=>keys.includes(row.month)).length;
  return {revenue,average:revenue/(month==='all'?last:1),monthCount:month==='all'?last:1,transactionCount:count,latestMonth:monthLabel(`${year}-${String(last).padStart(2,'0')}`),growth:monthly[0]?(monthly.at(-1)-monthly[0])/monthly[0]*100:0,categories:Object.entries(categories).map(([name,value])=>({name,percent:categoryTotal?Math.round(value/categoryTotal*100):0})),monthly};
}
function monthLabel(key){return new Intl.DateTimeFormat('en-PH',{month:'short',year:'numeric',timeZone:'Asia/Manila'}).format(new Date(`${key}-01T00:00:00+08:00`));}
function financeControls(){
  const {data,year,last,month}=financialPeriod();
  return `<div class="finance-controls"><label>Year <select aria-label="Reporting year" onchange="financeSelection.year=Number(this.value);financeSelection.month='all';render()">${(data?.years||[year]).map(value=>`<option ${value===year?'selected':''}>${value}</option>`).join('')}</select></label><label>Period <select aria-label="Reporting month" onchange="financeSelection.month=this.value;render()"><option value="all">Year to date / full year</option>${Array.from({length:last},(_,i)=>{const value=String(i+1).padStart(2,'0');return `<option value="${value}" ${month===value?'selected':''}>${monthLabel(`${year}-${value}`)}</option>`;}).join('')}</select></label></div>`;
}
function financialRevenueChart(){
  const {year,month}=financialPeriod(),m=financialReportMetrics(),max=Math.max(1,...m.monthly);
  const demo=Object.entries(financialData()?.demoMonthly||{}).filter(([key])=>key.startsWith(String(year)+'-')&&(month==='all'||key.endsWith('-'+month))).reduce((s,[,v])=>s+Number(v),0);
  return financeControls()+`<p class="card-sub demo-finance-note">Selected period includes ${money(demo)} fictional demo revenue. Existing unmarked records and V9 fictional examples remain distinguishable.</p><p class="card-sub">Realized revenue: fully settled, dated Paid payments. Unpaid quotations and cancelled orders are excluded.${Object.values(financialData()?.demoMonthly||{}).some(v=>v>0)?' Includes explicitly fictional classroom orders; demo amounts are identified below.':''}</p><div class="chart" role="img" aria-label="Monthly realized revenue by payment date">${m.monthly.map((value,index)=>`<div class="bar-wrap ${month===String(index+1).padStart(2,'0')?'is-selected':''}" data-month="${year}-${String(index+1).padStart(2,'0')}" data-revenue="${value}"><div class="bar-column"><span class="bar-value">${new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',notation:'compact',maximumFractionDigits:1}).format(value)}</span><div class="bar" title="${money(value)}" style="height:${value/max*78}%"></div><div class="bar-label">${monthLabel(`${year}-${String(index+1).padStart(2,'0')}`).split(' ')[0]}</div></div></div>`).join('')}</div>`;
}
function financialForecastData(){
  const f=financialData()?.forecast||{months:{},next:null,average:0,monthCount:0,forecastMonth:todayKey().slice(0,7)};
  const latest=Number(Object.values(f.months).at(-1)||0);
  return {...f,chartMonths:{...f.months,[f.partialMonth||todayKey().slice(0,7)]:Number(financialData()?.monthly?.[f.partialMonth]||0)},latest,forecastLabel:monthLabel(f.forecastMonth),count:f.monthCount,change:latest&&f.next!==null?(f.next-latest)/latest*100:0,factors:[['Complete monthly observations','Zero months are included after the first recorded month',String(f.monthCount)],['Model-only spike caps','Actual totals are preserved',String(f.cappedMonths||0)],['Indicative planning range','Forecast error, not a guaranteed outcome',f.next===null?'Insufficient history':`${money(f.lower)} – ${money(f.upper)}`]]};
}
function financialReportsPage(){
  const m=reportMetrics(),f=forecastData();
  return `<section class="content"><div class="page-head"><div><h1>Forecast & Reports</h1><p>${DEMO_MODE?escapeHtml(financialData().source):'Realized revenue uses the date full payment was reached, in Asia/Manila.'}</p></div><div class="actions"><button class="secondary" onclick="refreshFinancialReport()">Refresh data</button><button class="secondary" onclick="printReport()">Print / Save PDF</button></div></div>
  <div class="grid kpi-grid"><div class="card kpi"><div class="label">Realized revenue</div><div class="value">${money(m.revenue)}</div><div class="sub">${m.transactionCount} fully paid orders · ${revenuePeriodLabel()}</div></div><div class="card kpi"><div class="label">Monthly average</div><div class="value">${money(m.average)}</div><div class="sub">${m.monthCount} calendar months in selected period</div></div><div class="card kpi"><div class="label">${escapeHtml(f.forecastLabel)} forecast</div><div class="value">${f.next===null?'—':money(f.next)}</div><div class="sub">${f.next===null?'At least 3 complete months required':'Weights 1:2:3 on last 3 complete months'}</div></div><div class="card kpi"><div class="label">Outstanding balance</div><div class="value">${money(financialData()?.outstanding||0)}</div><div class="sub">All dates · excludes cancelled orders</div></div></div>
  <div class="card" style="margin-top:16px"><h2>Monthly Revenue</h2>${revenueChart()}<p class="card-sub">The chart retains the year context; selected-period cards and categories follow the filter. Pending, unpaid and cancelled orders do not contribute. Each fully paid order is recognized once, capped at its order total.${financialData()?.undatedPaidPayments?' Undated paid payments need reconciliation before recognition.':''}</p></div>
  <div class="grid two-grid" style="margin-top:16px"><div class="card"><h2>Actual revenue & forecast</h2>${forecastChart(f)}<p class="card-sub">${escapeHtml(f.method||'Database history unavailable.')}</p></div><div class="card"><h2>Forecast assumptions</h2>${f.factors.map(([title,detail,value])=>`<div class="quick-item"><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></div><span class="forecast-factor-value">${escapeHtml(value)}</span></div>`).join('')}<h2>Sales by category</h2>${m.categories.map(c=>`<div class="quick-item"><strong>${escapeHtml(c.name)}</strong><span>${c.percent}%</span></div>`).join('')||'<p class="empty">No realized sales in this period.</p>'}</div></div><div class="card" style="margin-top:16px"><h2>Inventory turnover</h2><p class="card-sub">Recorded material sales and receipts, across all dates.</p>${turnoverChart()}</div>${inventoryPlanningSection(true)}</section>`;
}
async function refreshFinancialReport(){try{await refreshDatabase();render();toast('Reports refreshed from MySQL');}catch(error){toast(error.message);}}
for(const page of ['Forecast & Reports','Forecasting','Reports'])pages[page]=financialReportsPage;
