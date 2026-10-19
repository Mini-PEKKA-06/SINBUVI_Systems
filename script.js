const KEY="singin-connect-data";
const SEED_VERSION="2026-10-16-demo";
const state={page:"Splash",role:"admin",clientAuthMode:"login",accountName:"",accountType:"",transactions:[],clients:[],inventory:[],schedules:[],negotiations:[]};
// Legacy browser-only simulation. Its comparison digest grants no PHP session.
const adminAccount={name:"Philip Singin",email:"philip.singin@singin.ph",passwordHash:"d35cfc301621c71af143eb557124c7f0c08b0ceebae962722570404f3b29cb2d",role:"admin"};
let clientCalendarDate=new Date(todayKey()+'T12:00:00');
let selectedClientCalendarDate="";
let adminCalendarDate=new Date(todayKey()+'T12:00:00');
let clientScheduleCache={clientName:null,items:[],index:Object.create(null),upcoming:[]};
let clientCalendarRefreshQueued=false;

const seed={
transactions:[
{id:"TXN-2026-001",client:"Fernandez Constructions",product:"Tempered Glass 10mm",quantity:30,unitPrice:1200,amount:36000,date:"2026-08-25",status:"Paid",paymentMethod:"Bank Transfer"},
{id:"TXN-2026-002",client:"Santos Building Corp",product:'Aluminum Framing 4"',quantity:120,unitPrice:250,amount:30000,date:"2026-08-24",status:"Paid",paymentMethod:"Cash"},
{id:"TXN-2026-003",client:"Reyes Properties",product:"Laminated Glass 8mm",quantity:20,unitPrice:1850,amount:37000,date:"2026-08-23",status:"Pending",paymentMethod:"Bank Transfer"},
{id:"TXN-2026-004",client:"Cruz Developers",product:"Curtain Wall Profile",quantity:80,unitPrice:450,amount:36000,date:"2026-08-22",status:"Paid",paymentMethod:"Check"},
{id:"TXN-2026-005",client:"Mendoza Architecture",product:"Frosted Glass 6mm",quantity:15,unitPrice:950,amount:14250,date:"2026-08-20",status:"Overdue",paymentMethod:"Bank Transfer"},
{id:"TXN-2026-006",client:"Garcia Home Builders",product:"Tempered Glass 6mm",quantity:25,unitPrice:850,amount:21250,date:"2026-08-18",status:"Paid",paymentMethod:"Cash"},
{id:"TXN-2026-007",client:"Aquino Commercial",product:"Aluminum Louver Blade",quantity:200,unitPrice:180,amount:36000,date:"2026-08-15",status:"Paid",paymentMethod:"Bank Transfer"},
{id:"TXN-2026-008",client:"Dela Cruz Interiors",product:"Spider Fitting SS",quantity:40,unitPrice:1200,amount:48000,date:"2026-08-12",status:"Cancelled",paymentMethod:""},
{id:"TXN-2026-101",clientId:9,client:"Harborline Buildworks",product:"Clear Float Glass 4mm",quantity:4,unitPrice:450,amount:1800,date:"2026-07-03",status:"Paid",paymentMethod:"Cash"},
{id:"TXN-2026-102",clientId:10,client:"Luna Office Interiors",product:"Aluminum Sliding Channel",quantity:10,unitPrice:180,amount:1800,date:"2026-07-08",status:"Paid",paymentMethod:"Bank Transfer"},
{id:"TXN-2026-103",clientId:11,client:"Northgate Property Group",product:"Tempered Glass 12mm",quantity:2,unitPrice:1550,amount:3100,date:"2026-07-14",status:"Paid",paymentMethod:"Check"},
{id:"TXN-2026-104",clientId:12,client:"Mikaela Torres",product:"Stainless Door Handle",quantity:2,unitPrice:850,amount:1700,date:"2026-07-21",status:"Paid",paymentMethod:"GCash"},
{id:"TXN-2026-105",clientId:13,client:"Pinnacle Glassworks",product:"Tempered Glass 10mm",quantity:2,unitPrice:1200,amount:2400,date:"2026-07-29",status:"Paid",paymentMethod:"Maya"},
{id:"TXN-2026-106",clientId:14,client:"Cedar & Stone Design",product:"Aluminum Angle Bar 2x2",quantity:6,unitPrice:150,amount:900,date:"2026-08-02",status:"Paid",paymentMethod:"Cash"},
{id:"TXN-2026-107",clientId:15,client:"Eastwood Retail Spaces",product:"Tempered Glass 6mm",quantity:3,unitPrice:850,amount:2550,date:"2026-08-09",status:"Pending",paymentMethod:"Bank Transfer"},
{id:"TXN-2026-108",clientId:16,client:"Asteria Residences",product:"Curtain Wall Profile",quantity:2,unitPrice:450,amount:900,date:"2026-08-15",status:"Paid",paymentMethod:"Check"},
{id:"TXN-2026-109",clientId:17,client:"Nicolette Ramos",product:"Silicone Sealant",quantity:4,unitPrice:350,amount:1400,date:"2026-08-22",status:"Paid",paymentMethod:"GCash"},
{id:"TXN-2026-110",clientId:18,client:"Summitline Contractors",product:"Laminated Glass 8mm",quantity:2,unitPrice:1850,amount:3700,date:"2026-08-30",status:"Pending",paymentMethod:"Maya"},
{id:"TXN-2026-111",clientId:19,client:"Verde Vista Homes",product:"Aluminum Louver Blade",quantity:5,unitPrice:180,amount:900,date:"2026-09-04",status:"Paid",paymentMethod:"Cash"},
{id:"TXN-2026-112",clientId:20,client:"Arcline Studio",product:"Tempered Glass 6mm",quantity:2,unitPrice:850,amount:1700,date:"2026-09-10",status:"Paid",paymentMethod:"Bank Transfer"},
{id:"TXN-2026-113",clientId:21,client:"Metro Crest Engineering",product:"Spider Fitting SS",quantity:1,unitPrice:1200,amount:1200,date:"2026-09-16",status:"Overdue",paymentMethod:"Check"},
{id:"TXN-2026-114",clientId:22,client:"Paolo Villanueva",product:"Aluminum Angle Bar 2x2",quantity:3,unitPrice:150,amount:450,date:"2026-09-22",status:"Paid",paymentMethod:"GCash"},
{id:"TXN-2026-115",clientId:23,client:"Bayview Commercial Spaces",product:"Aluminum Sliding Channel",quantity:5,unitPrice:180,amount:900,date:"2026-09-28",status:"Cancelled",paymentMethod:"Maya"}
],
clients:[
["Fernandez Constructions","Business","Maria Fernandez","mfernandez@ferconstruct.ph","09171234567","45 Shaw Blvd, Mandaluyong City",8,245000,"2026-08-25"],
["Santos Building Corp","Business","Jose Santos","jsantos@santosbuilding.ph","09281234567","12 C. Raymundo Ave, Pasig City",5,180000,"2026-08-24"],
["Reyes Properties","Business","Ana Reyes","areyes@reyesprops.ph","09391234567","78 Meralco Ave, Pasig City",3,92000,"2026-08-23"],
["Cruz Developers","Business","Roberto Cruz","rcruz@cruzdev.ph","09171234568","BGC, Taguig City",12,580000,"2026-08-22"],
["Mendoza Architecture","Business","Lila Mendoza","lmendoza@mendozaarch.ph","09281234568","Ortigas Center, Pasig City",6,135000,"2026-08-20"],
["Garcia Home Builders","Business","Pedro Garcia","pgarcia@garciahomes.ph","09391234568","San Antonio, Pasig City",4,89500,"2026-08-18"],
["Aquino Commercial","Business","Clara Aquino","caquino@aquinocomm.ph","09171234569","Kapitolyo, Pasig City",7,210000,"2026-08-15"],
["Miguel dela Cruz","Individual","Miguel dela Cruz","mdelacruz@gmail.com","09281234569","Valle Verde, Pasig City",2,48000,"2026-08-12"]
].map((x,i)=>({id:i+1,name:x[0],type:x[1],contact:x[2],email:x[3],phone:x[4],address:x[5],transactions:x[6],totalSpent:x[7],lastTransaction:x[8]})).concat([
{id:9,name:"Harborline Buildworks",type:"Business",contact:"Rafael Lim",email:"rafael.lim@harborline.example.ph",phone:"09175550101",address:"18 A. Bonifacio Avenue, Quezon City",companyName:"Harborline Buildworks"},
{id:10,name:"Luna Office Interiors",type:"Business",contact:"Sofia Luna",email:"sofia.luna@lunaoffice.example.ph",phone:"09175550102",address:"27 Jupiter Street, Makati City",companyName:"Luna Office Interiors"},
{id:11,name:"Northgate Property Group",type:"Business",contact:"Adrian Co",email:"adrian.co@northgate.example.ph",phone:"09175550103",address:"9th Avenue, Bonifacio Global City, Taguig",companyName:"Northgate Property Group"},
{id:12,name:"Mikaela Torres",type:"Individual",contact:"Mikaela Torres",email:"mikaela.torres@sample.example.ph",phone:"09175550104",address:"56 P. Tuazon Boulevard, Quezon City",companyName:""},
{id:13,name:"Pinnacle Glassworks",type:"Business",contact:"Beatrice Yu",email:"beatrice.yu@pinnacleglass.example.ph",phone:"09175550105",address:"33 West Capitol Drive, Pasig City",companyName:"Pinnacle Glassworks"},
{id:14,name:"Cedar & Stone Design",type:"Business",contact:"Miguel Santos",email:"miguel.santos@cedarstone.example.ph",phone:"09175550106",address:"14 Scout Rallos Street, Quezon City",companyName:"Cedar & Stone Design"},
{id:15,name:"Eastwood Retail Spaces",type:"Business",contact:"Katrina Ong",email:"katrina.ong@eastwoodretail.example.ph",phone:"09175550107",address:"Eastwood City, Bagumbayan, Quezon City",companyName:"Eastwood Retail Spaces"},
{id:16,name:"Asteria Residences",type:"Business",contact:"Paolo Bautista",email:"paolo.bautista@asteriares.example.ph",phone:"09175550108",address:"20th Drive, Bonifacio Global City, Taguig",companyName:"Asteria Residences"},
{id:17,name:"Nicolette Ramos",type:"Individual",contact:"Nicolette Ramos",email:"nicolette.ramos@sample.example.ph",phone:"09175550109",address:"81 M. H. del Pilar Street, San Juan City",companyName:""},
{id:18,name:"Summitline Contractors",type:"Business",contact:"Emilio Garcia",email:"emilio.garcia@summitline.example.ph",phone:"09175550110",address:"6 Dona Julia Vargas Avenue, Pasig City",companyName:"Summitline Contractors"},
{id:19,name:"Verde Vista Homes",type:"Business",contact:"Lourdes Tan",email:"lourdes.tan@verdevista.example.ph",phone:"09175550111",address:"58 Congressional Avenue, Quezon City",companyName:"Verde Vista Homes"},
{id:20,name:"Arcline Studio",type:"Business",contact:"Gabriel Flores",email:"gabriel.flores@arcline.example.ph",phone:"09175550112",address:"15 Salcedo Street, Legazpi Village, Makati City",companyName:"Arcline Studio"},
{id:21,name:"Metro Crest Engineering",type:"Business",contact:"Isabel Chua",email:"isabel.chua@metrocrest.example.ph",phone:"09175550113",address:"102 EDSA, Mandaluyong City",companyName:"Metro Crest Engineering"},
{id:22,name:"Paolo Villanueva",type:"Individual",contact:"Paolo Villanueva",email:"paolo.villanueva@sample.example.ph",phone:"09175550114",address:"42 Katipunan Avenue, Quezon City",companyName:""},
{id:23,name:"Bayview Commercial Spaces",type:"Business",contact:"Andrea Lim",email:"andrea.lim@bayviewcommercial.example.ph",phone:"09175550115",address:"11 Macapagal Boulevard, Pasay City",companyName:"Bayview Commercial Spaces"}
]),
inventory:[
["GLT-010","Tempered Glass 10mm","Glass",12,"sq.m",1200,20],["GLT-006","Tempered Glass 6mm","Glass",45,"sq.m",850,20],["GLT-012","Tempered Glass 12mm","Glass",8,"sq.m",1550,15],["GLL-008","Laminated Glass 8mm","Glass",30,"sq.m",1850,15],["GLF-006","Frosted Glass 6mm","Glass",0,"sq.m",950,10],["GLC-004","Clear Float Glass 4mm","Glass",60,"sq.m",450,30],["ALF-004",'Aluminum Framing 4"',"Aluminum",0,"pcs",250,50],["ALS-001","Aluminum Sliding Channel","Aluminum",85,"pcs",180,40],["ALC-001","Curtain Wall Profile","Aluminum",15,"pcs",450,30],["ALL-001","Aluminum Louver Blade","Aluminum",250,"pcs",180,50],["ALA-002","Aluminum Angle Bar 2x2","Aluminum",120,"pcs",150,50],["HWS-001","Spider Fitting SS","Hardware",40,"pcs",1200,20],["HWD-001","Stainless Door Handle","Hardware",5,"pcs",850,10],["ACC-SIL","Silicone Sealant","Accessories",48,"tubes",350,20]
].map((x,i)=>({id:i+1,sku:x[0],name:x[1],category:x[2],quantity:x[3],unit:x[4],price:x[5],minStock:x[6]})),
schedules:[
["Fernandez Constructions","Glass Installation","2026-08-28","09:00","Confirmed","3rd floor window panels, bring silicone sealant","45 Shaw Blvd, Mandaluyong"],
["Santos Building Corp","Site Measurement","2026-08-28","14:00","Pending","","12 C. Raymundo Ave, Pasig"],
["Reyes Properties","Delivery","2026-08-30","10:00","Confirmed","Tempered glass panels x20","78 Meralco Ave, Pasig"],
["Cruz Developers","Aluminum Fabrication","2026-09-01","08:00","Pending","Curtain wall system quote","BGC, Taguig"],
["Mendoza Architecture","Glass Installation","2026-09-02","13:00","Confirmed","Frameless glass partition","Ortigas Center, Pasig"],
["Garcia Home Builders","Repair","2026-08-20","11:00","Completed","Cracked panel replacement","San Antonio, Pasig"],
["Aquino Commercial","Delivery","2026-08-15","09:30","Completed","Aluminum framing materials","Kapitolyo, Pasig"],
["Dela Cruz Interiors","Site Measurement","2026-08-25","15:00","Cancelled","","Valle Verde, Pasig"]
].map((x,i)=>({id:i+1,client:x[0],service:x[1],date:x[2],time:x[3],status:x[4],notes:x[5],address:x[6]})),
negotiations:[
{id:"NEG-001",client:"Fernandez Constructions",subject:"Bulk order discount - Tempered Glass 10mm",relatedOrder:"TXN-2026-001",clientOffer:1050,adminOffer:1100,quantity:30,message:"Can we get a better unit price for 30 sq.m?",status:"Counter Offer",lastBy:"Admin",updated:"2026-08-26T10:30:00"},
{id:"NEG-002",client:"Reyes Properties",subject:"Laminated Glass 8mm quotation",relatedOrder:"TXN-2026-003",clientOffer:1750,adminOffer:1800,quantity:20,message:"We would like to confirm if a volume discount is possible.",status:"Client Offer",lastBy:"Client",updated:"2026-08-24T14:15:00"}
]};
for(const t of seed.transactions.filter(t=>t.clientId&&t.status!=="Cancelled")){const product=seed.inventory.find(i=>i.name===t.product);if(product)product.quantity=Math.max(0,product.quantity-t.quantity)}
function resetSeedData(){state.transactions=seed.transactions.map(t=>({...t}));state.clients=seed.clients.map(c=>({...c}));state.inventory=seed.inventory.map(i=>({...i}));state.schedules=seed.schedules.map(s=>({...s}));state.negotiations=seed.negotiations.map(n=>({...n}))}
function recalculateClientStats(){
 const totals=new Map();for(const t of state.transactions){if(t.status==='Cancelled'||t.clientId==null)continue;const key=String(t.clientId),sum=totals.get(key)||{count:0,amount:0,last:''};sum.count++;sum.amount+=Number(t.amount)||0;if(t.date>sum.last)sum.last=t.date;totals.set(key,sum);}
 for(const client of state.clients){const sum=totals.get(String(client.id));client.transactions=sum?.count||0;client.totalSpent=sum?.amount||0;client.lastTransaction=sum?.last||null;}
}
function load(){
 invalidateClientScheduleCache();
 if(!DEMO_MODE)return;
 const stored=localStorage.getItem(KEY);
 if(stored){try{const data=JSON.parse(stored);Object.assign(state,normalizeRecords(data));}catch(error){statusMessage('Stored browser demo data is unreadable. Original data retained; showing sample data.',true);resetSeedData();}}
 else resetSeedData();
 normalizeRecords(state);recalculateClientStats();
}
function save(){recalculateClientStats();if(DEMO_MODE){try{localStorage.setItem(KEY,JSON.stringify({seedVersion:SEED_VERSION,transactions:state.transactions,clients:state.clients,inventory:state.inventory,schedules:state.schedules,negotiations:state.negotiations}));}catch(error){toast('Browser storage is unavailable. Changes will be lost after refresh.');}}}

// Keep separate Admin and Client tabs in sync. The browser fires this event in
// every other tab that is open on the same website whenever localStorage changes.
window.addEventListener("storage",event=>{
if(!DEMO_MODE||event.key!==KEY||!event.newValue)return;
try{
Object.assign(state,normalizeRecords(JSON.parse(event.newValue)));
invalidateClientScheduleCache();
if(state.page!=="Login" && state.page!=="Splash" && state.page!=="Welcome"){
  if(state.role==="client" && state.page==="Calendar"){
    refreshClientCalendarOnly(true);
  }else if(state.role!=="client" && (state.page==="Calendar" || state.page==="Scheduling")){
    refreshAdminCalendarOnly();
  }else{
    render();
  }
}
}catch(error){console.error("Could not sync shared data",error)}
});
const money=n=>"₱"+Number(n||0).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2});
const dateFmt=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||"")?new Date(d+"T00:00:00").toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"}):"—";
const badge=s=>`<span class="badge ${String(s).toLowerCase().replace(/[^a-z]/g,"")}">${escapeHtml(s==='In Stock'?'Good Stock':s)}</span>`;
function toast(t){let x=document.createElement("div");x.className="toast";x.textContent=t;document.body.appendChild(x);setTimeout(()=>x.remove(),2200)}
function openModal(html){closeMobileMenu();closeNotifications();document.getElementById("modalContent").innerHTML=html;document.body.classList.add("modal-open");document.getElementById("modal").classList.remove("hidden")}
function closeModal(){document.getElementById("modal").classList.add("hidden");document.body.classList.remove("modal-open")}
// -----------------------------
// Navigation
// -----------------------------
function nav(page) {
  state.page = page;
  closeMobileMenu();
  render();
  window.scrollTo(0,0);
}

function toggleMobileMenu() {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.querySelector(".mobile-menu-overlay");

  if (!sidebar || !overlay) return;

  const isOpen = sidebar.classList.toggle("mobile-open");
  overlay.classList.toggle("hidden", !isOpen);
  document.body.classList.toggle("menu-open", isOpen);
}

function closeMobileMenu() {
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.querySelector(".mobile-menu-overlay");

  if (sidebar) sidebar.classList.remove("mobile-open");
  if (overlay) overlay.classList.add("hidden");
  document.body.classList.remove("menu-open");
}
function layout(content){
const adminNav=["Dashboard","Calendar","Transactions","Negotiation","Receipts","Inventory","Clients","Forecast & Reports"];
const clientNav=["Dashboard","My Transactions","Calendar","My Schedule","Negotiation"];
const navItems=state.role==="client"?clientNav:adminNav;
const icons={Dashboard:"▦",Calendar:"◫",Scheduling:"◫",Transactions:"▤",Receipts:"▧","My Transactions":"▤",Inventory:"▥",Clients:"♙","Forecast & Reports":"⌁",Forecasting:"⌁",Reports:"◒","My Schedule":"◫",Negotiation:"⇄"};
const title=state.role==="client"?"Client Portal":"Administrator Portal";
return `<div class="app-shell">
<div class="mobile-menu-overlay hidden" onclick="closeMobileMenu()"></div>
<aside class="sidebar">
<div class="mobile-sidebar-head"><strong>${title}</strong><button type="button" class="mobile-close" onclick="closeMobileMenu()" aria-label="Close menu">×</button></div>
<div class="logo"><div class="logo-mark"><img src="logo.png" alt="Singin Connect logo"></div><div class="logo-copy"><div class="logo-title-row"><button class="logo-title logo-title-action" type="button" onclick="logout()" aria-label="Sign out" title="Click the title to sign out">Singin Connect</button></div><div class="logo-sub">Glass & Aluminum Supply</div></div></div>
<div class="portal-label">${title}</div>
<nav class="nav">${navItems.map(p=>`<button class="${state.page===p?"active":""}" onclick="nav('${p}')">${icons[p]} &nbsp; ${p}</button>`).join("")}</nav>
<div class="sidebar-bottom"><div class="user-box"><div class="avatar">${escapeHtml((state.accountName||state.clientName||"SC").split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase())}</div><div class="user-details"><strong>${escapeHtml(state.role==="client"?(state.clientName||"Client"):(state.accountName||"Philip Singin"))}</strong><small>${state.role==="client"?"Client":"Admin Account"}</small></div><button class="user-logout" type="button" onclick="logout()" aria-label="Exit" title="Exit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg><span>Exit</span></button></div></div></aside>
<main class="main"><div class="topbar">
<div class="topbar-left">
  <button class="mobile-menu-button" type="button" onclick="toggleMobileMenu()" aria-label="Open navigation menu" aria-expanded="false">
    <span></span><span></span><span></span>
  </button>
  <div class="topbar-title">${state.page}</div>
</div>
<div class="topbar-tools">
  <div class="topbar-search"><input id="globalSearch" type="search" placeholder="Search..." aria-label="Search" onkeydown="handleGlobalSearch(event)"></div>
  <div class="account-label">${state.role==="client"?"Client Account":"Admin Account"}</div>
  <div class="notification-wrap">
    <button class="notification-btn" type="button" onclick="toggleNotifications(event)" aria-label="Notifications">
      <span class="notification-icon">🔔</span>${notificationCount()?`<span class="notification-count">${notificationCount()>9?"9+":notificationCount()}</span>`:""}
    </button>
    <div id="notificationPanel" class="notification-panel hidden"></div>
  </div>
</div></div>${content}</main></div>`
}
function notificationItems(){
  const items=[];
  if(state.role==="admin"){
    state.schedules.filter(x=>x.status==="Pending").forEach(x=>items.push({icon:"📅",title:"Pending schedule",text:`${x.client} — ${x.service}`,action:"nav('Calendar')"}));
    state.transactions.filter(x=>x.status==="Pending"||x.status==="Overdue").forEach(x=>items.push({icon:"🧾",title:`${escapeHtml(x.status)} transaction`,text:`${x.id} — ${x.client}`,action:"nav('Transactions')"}));
    state.inventory.filter(x=>inventoryStockStatus(x)==='Low Stock').forEach(x=>items.push({icon:"📦",title:"Low stock",text:`${x.name} (${x.quantity} ${x.unit})`,action:"nav('Inventory')"}));
    state.negotiations.filter(x=>x.status!=="Accepted"&&x.status!=="Rejected").forEach(x=>items.push({icon:"⇄",title:"Negotiation update",text:x.subject,action:"nav('Negotiation')"}));
  }else{
    clientSchedules().filter(x=>x.status==="Confirmed"||x.status==="Pending").forEach(x=>items.push({icon:"📅",title:`${escapeHtml(x.status)} schedule`,text:`${x.service} — ${dateFmt(x.date)}`,action:"nav('Calendar')"}));
    state.negotiations.filter(x=>belongsTo(x,clientData()) && x.status!=="Accepted"&&x.status!=="Rejected").forEach(x=>items.push({icon:"⇄",title:"Negotiation update",text:x.subject,action:"nav('Negotiation')"}));
  }
  return items.slice(0,50);
}
function notificationCount(){return notificationItems().length}
function toggleNotifications(event){
  event.stopPropagation();
  const panel=document.getElementById("notificationPanel");
  if(!panel)return;
  if(!panel.classList.contains("hidden")){
    panel.classList.add("hidden"); return;
  }
  const items=notificationItems();
  panel.innerHTML=`<div class="notification-head"><strong>Notifications</strong><button type="button" onclick="toggleNotifications(event)">×</button></div>`+
    (items.length?items.map(x=>`<button class="notification-item" type="button" onclick="${x.action};closeNotifications()"><span class="notification-item-icon">${x.icon}</span><span><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.text)}</small></span></button>`).join(""):`<div class="notification-empty">🔔<strong>No new notifications</strong><small>You're all caught up.</small></div>`);
  panel.classList.remove("hidden");
}
function closeNotifications(){
  const panel=document.getElementById("notificationPanel");
  if(panel)panel.classList.add("hidden");
}
function handleGlobalSearch(event){
 if(event.key!=='Enter')return;const query=event.target.value.trim().toLowerCase();if(!query)return;
 if(state.role==='client'){nav('My Transactions');document.getElementById('txnTable').innerHTML=txnTable(clientTransactions().filter(t=>(t.id+' '+t.product).toLowerCase().includes(query)),true);return;}
 const targets=[['Transactions','txnSearch','txnTable',state.transactions,t=>t.id+' '+t.client+' '+t.product,filterTransactions],['Inventory','invSearch','invTable',state.inventory,i=>i.sku+' '+i.name,filterInventory],['Clients','clientSearch','clientTable',state.clients,c=>c.name+' '+c.contact+' '+c.email,filterClients]];
 const found=targets.find(([page,id,table,items,label])=>page===state.page&&items.some(x=>label(x).toLowerCase().includes(query)))||targets.find(([page,id,table,items,label])=>items.some(x=>label(x).toLowerCase().includes(query)));
 if(!found){toast('No matching transactions, materials or clients.');return;}nav(found[0]);document.getElementById(found[1]).value=query;found[5]();
}
document.addEventListener("click",event=>{
  if(!event.target.closest(".notification-wrap"))closeNotifications();
});

function render(){const available=state.role==="client"?clientPages:pages;document.getElementById("app").innerHTML=state.page==="Splash"?splash():state.page==="Login"?login():state.page==="Welcome"?welcome():layout(available[state.page]?available[state.page]():available.Dashboard());}
function splash(){
return `<div class="splash-screen">
  <div class="splash-content">
    <img src="logo.png" class="splash-logo" alt="Singin Connect logo">
    <div class="splash-title">Singin Connect</div>
    <div class="splash-subtitle">Glass &amp; Aluminum Supply</div>
    <div class="splash-welcome">WELCOME</div>
    <div class="splash-loading"><span></span></div>
  </div>
</div>`;
}
function login(){return `<div class="login">
<div class="login-brand">
  <div class="brand-logo">
    <img src="logo.png" alt="Singin Connect logo">
    <div><div class="logo-title">Singin Connect</div><div class="logo-sub">Glass & Aluminum Supply</div></div>
  </div>
  <div class="login-copy">
    <div class="welcome-label">WELCOME TO</div>
    <h1>Singin Connect</h1>
    <p>A simple and connected platform for managing glass and aluminum orders, clients, schedules, transactions, and inventory.</p>
  </div>
  <div class="features">
    <div class="feature"><span class="feature-icon">📅</span><div><strong>Smart Scheduling</strong><small>Manage installations, deliveries, and site visits</small></div></div>
    <div class="feature"><span class="feature-icon">🧾</span><div><strong>Transaction Tracking</strong><small>Monitor orders, payments, and client transactions</small></div></div>
    <div class="feature"><span class="feature-icon">📦</span><div><strong>Inventory Management</strong><small>Keep track of glass, aluminum, and supplies</small></div></div>
  </div>
</div>
<div class="login-form-wrap">
  <div class="login-card">
    <div class="form-logo"><img src="logo.png" alt="Singin Connect logo"></div>
    <div class="welcome-label dark">WELCOME</div>
    <h2>Welcome to Singin Connect</h2>
    <p>Sign in to continue to your account.</p>
    <div class="role-toggle"><button id="adminRole" class="${state.role!=="client"?"active":""}" onclick="setRole('admin')">Admin</button><button id="clientRole" class="${state.role==="client"?"active":""}" onclick="setRole('client')">Client</button></div>
    <form onsubmit="${state.role==="client"&&state.clientAuthMode==="signup"?"doClientSignup(event)":"doLogin(event)"}">
      ${state.role==="client"&&state.clientAuthMode==="signup"?`<div class="field"><label>Full name</label><input id="clientNameInput" type="text" autocomplete="name" placeholder="Your full name" oninput="clearLoginMessage()" required></div>`:""}
      <div class="field"><label>Email address</label><input id="email" type="email" autocomplete="email" placeholder="${state.role==="client"?"client@email.com":"philip.singin@singin.ph"}" oninput="clearLoginMessage()" required></div>
      <div class="field"><label>Password</label><input id="password" type="password" autocomplete="${state.role==="client"&&state.clientAuthMode==="signup"?"new-password":"current-password"}" placeholder="${state.role==="client"&&state.clientAuthMode==="signup"?"At least 8 characters":"••••••••"}" minlength="${state.role==="client"&&state.clientAuthMode==="signup"?"8":"1"}" oninput="clearLoginMessage()" required></div>
      ${state.role==="client"&&state.clientAuthMode==="signup"?`<div class="field"><label>Confirm password</label><input id="confirmPassword" type="password" autocomplete="new-password" placeholder="Re-enter your password" minlength="8" oninput="clearLoginMessage()" required></div>`:`<div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin:8px 0 18px"><span>Classroom sign-in simulation</span>${state.role==="client"?`<a href="#" onclick="event.preventDefault();openPasswordReset()">Forgot password?</a>`:""}</div>`}
      <button class="primary full">${state.role==="client"&&state.clientAuthMode==="signup"?"Create Client Account":`Sign in as ${state.role==="client"?"Client":"Admin"}`}</button>
    </form>
    ${state.role==="client"?`<button class="auth-mode-link" type="button" onclick="setClientAuthMode('${state.clientAuthMode==="signup"?"login":"signup"}')">${state.clientAuthMode==="signup"?"Already have an account? Sign in":"New client? Create an account"}</button>`:""}
    <p id="loginMessage" class="demo-hint login-message" aria-live="polite">${state.role==="client"?(state.clientAuthMode==="signup"?"Create an account to access your client portal.":"Use the email and password on your client account."):"Sign in to the administrator dashboard."}</p>
  </div>
</div>
</div>`}
function setRole(role){state.role=role;state.clientAuthMode="login";state.page="Login";render()}
function setClientAuthMode(mode){state.clientAuthMode=mode;render()}
function openPasswordReset(){if(DEMO_MODE){toast('Password reset requires the MySQL classroom mode.');return;}const email=document.getElementById("email")?.value.trim()||"";openModal(`<h2>Reset your password</h2><p>Enter the email address on your account. We’ll prepare a simulated verification email.</p><form onsubmit="requestPasswordReset(event)"><div class="field"><label>Email address</label><input id="resetEmail" type="email" value="${escapeHtml(email)}" required></div><p id="resetMessage" class="reset-message"></p><div class="modal-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary" type="submit">Send verification code</button></div></form>`)}
async function requestPasswordReset(event){event.preventDefault();const email=document.getElementById("resetEmail").value.trim().toLowerCase();try{const response=await fetch("api/password-reset-code.php",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})}),result=await response.json();if(!response.ok||!result.success)throw new Error(result.message||"Unable to prepare a verification code.");if(!result.demoCode){document.getElementById("modalContent").innerHTML=`<h2>Check your email</h2><p>${escapeHtml(result.message)}</p><p class="reset-note">This demo only shows simulated email for registered accounts.</p><div class="modal-actions"><button class="primary" type="button" onclick="closeModal()">Close</button></div>`;return}showPasswordResetCode(email,result.demoCode,result.expiresInMinutes||10)}catch(error){const message=document.getElementById("resetMessage");if(message)message.textContent=error.message==="Failed to fetch"?"The reset service needs Apache and MySQL running on localhost.":error.message}}
function showPasswordResetCode(email,code,minutes){document.getElementById("modalContent").innerHTML=`<h2>Verification code sent</h2><p>A simulated email has been prepared for <strong>${escapeHtml(email)}</strong>. Use this demo code to continue:</p><div class="simulated-email"><span>SIMULATED EMAIL</span><strong>Singin Connect password reset</strong><small>Your verification code</small><div class="simulated-code">${escapeHtml(code)}</div><small>This code expires in ${minutes} minutes.</small></div><form onsubmit="submitPasswordReset(event)"><div class="field"><label>Verification code</label><input id="resetCode" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required></div><div class="field"><label>New password</label><input id="resetNewPassword" type="password" minlength="8" autocomplete="new-password" required></div><div class="field"><label>Confirm new password</label><input id="resetConfirmPassword" type="password" minlength="8" autocomplete="new-password" required></div><p id="resetMessage" class="reset-message"></p><div class="modal-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary" type="submit">Update password</button></div></form>`}
async function submitPasswordReset(event){event.preventDefault();const code=document.getElementById("resetCode").value.trim(),password=document.getElementById("resetNewPassword").value,confirm=document.getElementById("resetConfirmPassword").value;if(password.length<8){document.getElementById("resetMessage").textContent="Choose a password with at least 8 characters.";return}if(password!==confirm){document.getElementById("resetMessage").textContent="The passwords do not match.";return}try{const response=await fetch("api/reset-client-password.php",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,password})}),result=await response.json();if(!response.ok||!result.success)throw new Error(result.message||"Unable to reset the password.");closeModal();toast("Password updated. Sign in with your new password.")}catch(error){const message=document.getElementById("resetMessage");if(message)message.textContent=error.message==="Failed to fetch"?"The reset service needs Apache and MySQL running on localhost.":error.message}}
function setLoginError(message){const box=document.getElementById("loginMessage");box.classList.add("is-error");box.setAttribute("role","alert");box.innerHTML=`<span class="login-error-title">Unable to continue</span><span>${escapeHtml(message)}</span>`}
async function readClientApiResponse(response,action){const body=await response.text();if(!body.trim())throw new Error(`${action} returned an empty response (HTTP ${response.status}). Check that the project is running through PHP and the API URL is correct.`);let result;try{result=JSON.parse(body)}catch{const contentType=response.headers.get("content-type")||"unknown content type";throw new Error(`${action} returned invalid JSON (HTTP ${response.status}, ${contentType}). Check the PHP server and API URL.`)}if(!result||typeof result!=="object"||Array.isArray(result))throw new Error(`${action} returned an invalid response (HTTP ${response.status}).`);return result}
function clearLoginMessage(){const box=document.getElementById("loginMessage");if(!box)return;box.classList.remove("is-error");box.removeAttribute("role");box.textContent=state.role==="client"?(state.clientAuthMode==="signup"?"Create an account to access your client portal.":"Use the email and password on your client account."):"Sign in to the administrator dashboard."}
async function passwordDigest(password){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(password));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("")}
async function doClientSignup(e){
 e.preventDefault();const name=document.getElementById('clientNameInput').value.trim(),email=document.getElementById('email').value.trim().toLowerCase(),password=document.getElementById('password').value,confirm=document.getElementById('confirmPassword').value;
 if(!name||password.length<8||password!==confirm){setLoginError('Enter a name and matching passwords with at least 8 characters.');return;}
 try{
 let client;
 if(DEMO_MODE){if(state.clients.some(c=>c.email.toLowerCase()===email))throw Error('This email is already registered.');client={id:newNumericId(),name,email,type:'Individual',contact:name,phone:'',address:'',passwordHash:await passwordDigest(password)};state.clients.push(client);save();}
 else{const result=await apiRequest('register-client.php',{name,email,password});client=result.account;await refreshDatabase();}
 signInClient(client,email);
 }catch(error){setLoginError(error.message);}
}
function signInClient(client,email){state.role='client';state.clientId=client.id;state.clientName=client.name;state.accountName=client.name;state.accountType='Client';state.currentEmail=email;state.page='Dashboard';invalidateClientScheduleCache();render();toast('Welcome, '+client.name);}
async function doLogin(e){
 e.preventDefault();const email=document.getElementById('email').value.trim().toLowerCase(),password=document.getElementById('password').value;
 const button=e.target.querySelector('button.primary');if(button.disabled)return;button.disabled=true;
 try{
 if(DEMO_MODE){
  if(state.role==='client'){const c=state.clients.find(c=>c.email.toLowerCase()===email);if(!c || (c.passwordHash ? c.passwordHash!==await passwordDigest(password) : password!=='clientdemo'))throw Error('Email or password is incorrect.');signInClient(c,email);return;}
  if(email!==adminAccount.email||await passwordDigest(password)!==adminAccount.passwordHash)throw Error('Email or password is incorrect.');
 }else{const result=await apiRequest(state.role==='client'?'login-client.php':'login.php',{email,password});state.accountName=result.account.name;await refreshDatabase();if(state.role==='client'){signInClient(result.account,email);return;}}
 state.role='admin';state.accountName=state.accountName||adminAccount.name;state.accountType='Admin';state.currentEmail=email;state.page='Dashboard';render();toast('Welcome, '+state.accountName);
 }catch(error){setLoginError(error.message);}finally{if(button.isConnected)button.disabled=false;}
}
async function logout(){if(!window.confirm('Are you sure you want to exit Singin Connect?'))return;try{if(!DEMO_MODE)await apiRequest('logout.php',{});}catch(error){toast(error.message);return;}state.page='Login';state.currentEmail='';state.accountName='';state.accountType='';state.clientId=null;state.clientName='';if(!DEMO_MODE)clearAccountData();render();}

function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]))}
function welcomeName(name){const first=String(name||"Philip").trim().split(/\s+/)[0];return state.role==="client"?first:`Mr. ${first}`}
function welcome(){
const isClient=state.role==="client";
const name=isClient?(state.clientName||"Client"):(state.accountName||"Philip Singin");
return `<div class="welcome-page">
  <div class="welcome-panel">
    <img src="logo.png" class="welcome-logo" alt="Singin Connect logo">
    <div class="welcome-label dark">SINGIN CONNECT</div>
    <h1>Welcome ${escapeHtml(welcomeName(name))}!</h1>
    <p class="account-role-badge">${isClient?"Client Account":"Admin Account"}</p>
    <p class="welcome-lead">Your connected workspace for <strong>glass and aluminum</strong> orders, scheduling, receipts, inventory, and business forecasting.</p>
    <div class="welcome-features">
      <div><span>📅</span><strong>Calendar System</strong><small>Appointments, deliveries, installations and site visits.</small></div>
      <div><span>🧾</span><strong>Receipt Generator</strong><small>Create printable transaction receipts in seconds.</small></div>
      <div><span>📈</span><strong>Revenue Forecasting</strong><small>Use transaction history to estimate upcoming revenue trends.</small></div>
      <div><span>🗄️</span><strong>Dynamic Database</strong><small>Connect products, clients, orders, payments and schedules.</small></div>
    </div>
    <button class="primary welcome-btn" onclick="state.page='Login';render()">Get Started →</button>
  </div>
</div>`}
function clientData(){
  const byId=state.clients.find(c=>String(c.id)===String(state.clientId));
  if(byId)return byId;
  const byEmail=state.clients.find(c=>state.currentEmail && c.email.toLowerCase()===state.currentEmail.toLowerCase());
  return byEmail||null;
}

function clientTransactions(){const c=clientData();return c?state.transactions.filter(t=>belongsTo(t,c)):[]}
function clientSchedules(){
  const c=clientData();
  const name=c?.name||null;
  if(clientScheduleCache.clientName===String(c?.id)) return clientScheduleCache.items;
  const items=name?state.schedules.filter(s=>belongsTo(s,c)&&s.status!=="Cancelled"):[];
  const index=Object.create(null);
  for(const item of items){ if(item.date) (index[item.date] ||= []).push(item); }
  for(const key in index) index[key].sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  const today=todayKey();
  const upcoming=items.filter(x=>x.date>=today).slice().sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  clientScheduleCache={clientName:String(c?.id),items,index,upcoming};
  return items;
}
function invalidateClientScheduleCache(){clientScheduleCache={clientName:null,items:[],index:Object.create(null),upcoming:[]};}

const clientPages={
Dashboard(){const c=clientData(), tx=clientTransactions(), paid=tx.filter(t=>t.status==="Paid").reduce((a,t)=>a+t.amount,0),pending=tx.filter(t=>["Pending","Overdue"].includes(t.status)).reduce((a,t)=>a+t.amount,0),sc=clientSchedules();return `<section class="content"><div class="page-head"><div><h1>Client Dashboard</h1><p>Welcome back, ${escapeHtml(c?.name||"Client")}. Track your orders, payments, and appointments.</p></div><button class="primary" onclick="openTransaction(true)">＋ Request Quotation</button></div><div class="grid kpi-grid"><div class="card kpi"><div class="label">Total Paid</div><div class="value" style="color:var(--green)">${money(paid)}</div><div class="sub">${tx.filter(t=>t.status==="Paid").length} paid transactions</div></div><div class="card kpi"><div class="label">Pending / Overdue</div><div class="value" style="color:var(--amber)">${money(pending)}</div><div class="sub">${tx.filter(t=>["Pending","Overdue"].includes(t.status)).length} open transactions</div></div><div class="card kpi"><div class="label">My Transactions</div><div class="value">${tx.length}</div><div class="sub">All order records</div></div><div class="card kpi"><div class="label">Upcoming Appointments</div><div class="value">${sc.filter(x=>x.status!=="Cancelled"&&x.date>=todayKey()).length}</div><div class="sub">Scheduled services</div></div></div><div class="grid two-grid" style="margin-top:16px"><div class="card"><div class="card-title">Recent Requests</div><div class="card-sub">Your latest transactions</div>${txnTable(tx.slice(0,5),true)}</div><div class="card"><div class="card-title">My Schedule</div><div class="card-sub">Upcoming appointments</div><div class="quick-list">${sc.filter(s=>s.date>=todayKey()).slice(0,5).map(s=>`<div class="quick-item"><div><strong>${escapeHtml(s.service)}</strong><small>${dateFmt(s.date)} · ${timeLabel(s.time)}</small></div>${badge(s.status)}</div>`).join("")||'<div class="empty">No upcoming schedules.</div>'}</div></div></div></section>`},
"My Transactions"(){const tx=clientTransactions();return `<section class="content"><div class="page-head"><div><h1>My Transactions</h1><p>View your orders and payment status.</p></div><button class="primary" onclick="openTransaction(true)">＋ Request Quotation</button></div><div class="card table-card"><div id="txnTable">${txnTable(tx,true)}</div></div></section>`},
Calendar(){const sc=clientSchedules(), upcoming=clientScheduleCache.upcoming;return `<section class="content"><div class="page-head"><div><h1>My Calendar</h1><p>Keep your appointments, deliveries, installations, and site visits organized.</p></div><button class="primary" onclick="openClientSchedule()">＋ Request Schedule</button></div><div class="calendar-summary"><div class="calendar-stat"><span class="calendar-stat-icon">📅</span><div><strong>${sc.length}</strong><small>Total schedules</small></div></div><div class="calendar-stat"><span class="calendar-stat-icon">⏳</span><div><strong>${sc.filter(x=>x.status==="Pending").length}</strong><small>Pending requests</small></div></div><div class="calendar-stat"><span class="calendar-stat-icon">✓</span><div><strong>${sc.filter(x=>x.status==="Confirmed").length}</strong><small>Confirmed</small></div></div><div class="calendar-stat"><span class="calendar-stat-icon">📌</span><div><strong>${upcoming.length}</strong><small>Upcoming</small></div></div></div><div class="client-calendar-layout"><div class="card client-calendar-card">${clientCalendar()}</div><aside class="card calendar-agenda"><div class="agenda-heading"><div><div class="card-title">Agenda</div><div class="card-sub">${upcoming.length?"Your next appointments":"No upcoming appointments"}</div></div><button class="today-btn" type="button" onclick="goToClientCalendarToday()">Today</button></div><div id="selectedCalendarEvents">${clientCalendarEvents(selectedClientCalendarDate,sc)}</div><div class="calendar-legend"><span><i class="legend-dot"></i> Scheduled</span><span><i class="legend-today"></i> Today</span><span><i class="legend-selected"></i> Selected</span></div></aside></div></section>`},
"My Schedule"(){const sc=clientSchedules();return `<section class="content"><div class="page-head"><div><h1>My Schedule</h1><p>Your installations, deliveries, measurements, and repairs.</p></div><button class="primary" onclick="openClientSchedule()">＋ Request Schedule</button></div><div class="card table-card"><div class="table-wrap"><table><thead><tr><th>Service</th><th>Date</th><th>Time</th><th>Status</th><th>Address</th><th>Notes</th></tr></thead><tbody>${sc.map(x=>`<tr><td><strong>${escapeHtml(x.service)}</strong></td><td>${dateFmt(x.date)}</td><td>${timeLabel(x.time)}</td><td>${badge(x.status)}</td><td>${escapeHtml(x.address||"—")}</td><td>${escapeHtml(x.notes||"—")}</td></tr>`).join("")||'<tr><td colspan="6" class="empty">No schedules yet.</td></tr>'}</tbody></table></div></div></section>`},
Negotiation(){return negotiationPage(true)}
};
const pages={
Dashboard(){let paid=Object.values(financialData()?.monthly||{}).reduce((sum,amount)=>sum+Number(amount),0),pending=Number(financialData()?.outstanding||0),low=state.inventory.filter(i=>inventoryStockStatus(i)==='Low Stock').length,out=state.inventory.filter(i=>i.quantity===0).length;
return `<section class="content"><div class="page-head"><div><h1>Admin Dashboard</h1><p>Welcome ${escapeHtml(welcomeName(state.accountName))}. Here's the full business overview.</p></div><button class="primary" onclick="openTransaction()">＋ New Transaction</button></div>
<div class="grid kpi-grid"><div class="card kpi"><div class="label">Total Paid Revenue</div><div class="value" style="color:var(--green)">${money(paid)}</div><div class="sub">All dates · ${financialData()?.recognized?.length||0} fully paid orders</div></div><div class="card kpi"><div class="label">Pending / Overdue</div><div class="value" style="color:var(--amber)">${money(pending)}</div><div class="sub">${state.transactions.filter(t=>["Pending","Overdue"].includes(t.status)).length} transactions</div></div><div class="card kpi"><div class="label">Low Stock Items</div><div class="value">${low}</div><div class="sub">${out} out of stock</div></div><div class="card kpi"><div class="label">Active Clients</div><div class="value">${state.clients.length}</div><div class="sub">${state.clients.filter(c=>c.type==="Business").length} business accounts</div></div></div>
<div class="grid two-grid" style="margin-top:16px"><div class="card"><div class="card-title">Monthly Revenue</div><div class="card-sub">${revenuePeriodLabel()}</div>${revenueChart()}</div><div class="card"><div class="card-title">Upcoming Schedule</div><div class="card-sub">Next appointments</div><div class="quick-list">${state.schedules.filter(s=>s.status!=="Cancelled"&&s.date>=todayKey()).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,4).map(s=>`<div class="quick-item"><div><strong>${escapeHtml(s.service)}</strong><small>${escapeHtml(s.client)}<br>${dateFmt(s.date)} · ${timeLabel(s.time)}</small></div>${badge(s.status)}</div>`).join("")||'<div class="empty">No upcoming appointments.</div>'}</div></div></div>
<div class="card table-card"><div class="card-title">Recent Transactions</div><div class="card-sub">Latest sales records</div>${txnTable(state.transactions.slice(0,5),false)}</div></section>`},
Scheduling(){return `<section class="content"><div class="page-head"><div><h1>Scheduling</h1><p>Manage installations, deliveries, site visits, and repairs.</p></div><button class="primary" onclick="openSchedule()">＋ New Schedule</button></div><div class="grid two-grid"><div class="card admin-calendar-card">${calendar()}</div><div class="card"><div class="card-title">Schedule List</div><div class="card-sub">Select any appointment to manage its status</div><div class="quick-list schedule-scroll">${state.schedules.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(s=>`<div class="quick-item" style="margin-bottom:8px"><div><strong>${escapeHtml(s.service)}</strong><small>${escapeHtml(s.client)}<br>${dateFmt(s.date)} · ${timeLabel(s.time)}</small><button class="text-action" type="button" onclick="manageSchedule(${jsArg(s.id)})">Manage schedule</button></div>${badge(s.status)}</div>`).join("")||'<div class="empty">No schedules yet.</div>'}</div></div></div></section>`},
Transactions(){return `<section class="content"><div class="page-head"><div><h1>Transactions</h1><p>Sales records and payment tracking</p></div><button class="primary" onclick="openTransaction()">＋ New Transaction</button></div><div class="grid kpi-grid"><div class="card kpi"><div class="label">Total Paid Revenue</div><div class="value" style="color:var(--green)">${money(state.transactions.filter(t=>t.status==="Paid").reduce((s,t)=>s+t.amount,0))}</div></div><div class="card kpi"><div class="label">Pending / Overdue</div><div class="value" style="color:var(--amber)">${money(state.transactions.filter(t=>["Pending","Overdue"].includes(t.status)).reduce((s,t)=>s+t.amount,0))}</div></div><div class="card kpi"><div class="label">Total Transactions</div><div class="value">${state.transactions.length}</div></div><div class="card kpi"><div class="label">Cancelled</div><div class="value">${state.transactions.filter(t=>t.status==="Cancelled").length}</div></div></div><div class="card table-card"><div class="table-tools"><input class="search" id="txnSearch" oninput="filterTransactions()" placeholder="Search ID, client, or product..."><select class="filter" id="txnFilter" onchange="filterTransactions()"><option>All</option><option>Paid</option><option>Pending</option><option>Overdue</option><option>Cancelled</option></select></div><div id="txnTable">${txnTable(state.transactions,true)}</div></div></section>`},
Inventory(){return `<section class="content"><div class="page-head"><div><h1>Inventory</h1><p>Monitor glass, aluminum, hardware, and accessories.</p></div><button class="primary" onclick="openInventory()">＋ Add Item</button></div><div class="grid kpi-grid"><div class="card kpi"><div class="label">Total Items</div><div class="value">${state.inventory.length}</div></div><div class="card kpi"><div class="label">Low Stock</div><div class="value" style="color:var(--amber)">${state.inventory.filter(i=>inventoryStockStatus(i)==='Low Stock').length}</div></div><div class="card kpi"><div class="label">Out of Stock</div><div class="value" style="color:var(--red)">${state.inventory.filter(i=>i.quantity===0).length}</div></div><div class="card kpi"><div class="label">Categories</div><div class="value">${new Set(state.inventory.map(i=>i.category)).size}</div></div></div><div class="card table-card"><div class="table-tools"><input class="search" id="invSearch" oninput="filterInventory()" placeholder="Search SKU or product..."><select class="filter" id="invFilter" onchange="filterInventory()"><option>All</option><option>Glass</option><option>Aluminum</option><option>Hardware</option><option>Accessories</option></select></div><div id="invTable">${inventoryTable(state.inventory)}</div></div></section>`},
Clients(){return `<section class="content"><div class="page-head"><div><h1>Clients</h1><p>Customer profiles and transaction history.</p></div><button class="primary" onclick="openClient()">＋ Add Client</button></div><div class="card table-card"><div class="table-tools"><input class="search" id="clientSearch" oninput="filterClients()" placeholder="Search client, contact, or email..."><select class="filter" id="clientFilter" onchange="filterClients()"><option>All</option><option>Business</option><option>Individual</option></select></div><div id="clientTable">${clientTable(state.clients)}</div></div></section>`},
Reports(){return financialReportsPage();}
};;
pages.Calendar=pages.Scheduling;
pages.Negotiation=function(){return negotiationPage(false)};
pages.Receipts=function(){
return `<section class="content"><div class="page-head"><div><h1>Receipt Generator</h1><p>Create and print receipts from Singin Connect transactions.</p></div><button class="primary" onclick="openReceipt()">＋ Generate Receipt</button></div>
<div class="card"><div class="card-title">Recent Transactions</div><div class="card-sub">Select a transaction to generate a printable receipt.</div>
${state.transactions.slice(0,10).map(t=>`<div class="quick-item receipt-row"><div><strong>${escapeHtml(t.id)} · ${escapeHtml(t.client)}</strong><small>${escapeHtml(t.product)} · ${t.quantity} × ${money(t.unitPrice)}<br>${dateFmt(t.date)} · ${escapeHtml(t.paymentMethod||"Payment pending")}</small></div><div style="display:flex;align-items:center;gap:8px">${badge(typeof paymentLabel==='function'?paymentLabel(t):t.status)}<button class="icon-btn" onclick="generateReceipt(${jsArg(t.id)})">Receipt</button></div></div>`).join("")||'<div class="empty" style="padding:24px">No transactions available for receipts.</div>'}</div></section>`};
function forecastData(){return financialForecastData();}
function forecastChart(f){
const historical=Object.entries(f.chartMonths||f.months).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>({label:new Date(key+"-01T00:00:00+08:00").toLocaleDateString("en-PH",{month:"short",timeZone:"Asia/Manila"})+(key===f.partialMonth?"*":""),value:Number(value),forecast:false}));
if(!historical.length) historical.push({label:"No data",value:0,forecast:false});
const points=f.next===null?historical:[...historical,{label:"Forecast",value:Number(f.next)||0,forecast:true}];
const max=Math.max(...points.map(p=>p.value),1),w=640,h=260,left=58,right=34,top=18,bottom=42,plotW=w-left-right,plotH=h-top-bottom;
const xy=points.map((p,i)=>({x:left+(points.length===1?plotW/2:i*plotW/(points.length-1)),y:top+plotH-(p.value/max)*plotH,...p}));
const grid=Array.from({length:5},(_,i)=>{const y=top+i*plotH/4,val=max*(1-i/4);return `<line class="forecast-gridline" x1="${left}" y1="${y}" x2="${w-right}" y2="${y}"/><text class="forecast-axis-label" x="${left-9}" y="${y+4}" text-anchor="end">${val>=1000?(val/1000).toFixed(val%1000?1:0)+"k":Math.round(val)}</text>`}).join("");
const line=arr=>arr.map(p=>`${p.x},${p.y}`).join(" ");
const historicalPoints=xy.filter(p=>!p.forecast), projected=f.next===null?[]:xy.slice(-2);
const labels=xy.map(p=>`<text class="forecast-month-label" x="${p.x}" y="${h-13}" text-anchor="middle">${p.label}</text>`).join("");
const dots=xy.map(p=>`<circle class="${p.forecast?'forecast-point forecast-point-future':'forecast-point'}" cx="${p.x}" cy="${p.y}" r="4"><title>${p.label}: ${money(p.value)}</title></circle>`).join("");
return `<div class="forecast-chart-wrap"><svg class="forecast-line-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Monthly revenue line chart with projected next month"><g>${grid}</g><polyline class="forecast-line" points="${line(historicalPoints)}" fill="none"/>${projected.length===2?`<line class="forecast-projection" x1="${projected[0].x}" y1="${projected[0].y}" x2="${projected[1].x}" y2="${projected[1].y}"/>`:""}${dots}${labels}</svg><div class="forecast-legend"><span><i></i> Actual revenue (* partial month)</span><span><i class="projected"></i> Forecast</span></div></div>`;
}
function openReceipt(){if(!state.transactions.length){toast("No transactions available for receipts.");return}openModal(`<h2>Generate Receipt</h2><form onsubmit="receiptFromForm(event)"><div class="field"><label>Transaction</label><select id="receiptTxn" required>${state.transactions.map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(t.id)} — ${escapeHtml(t.client)} — ${money(t.amount)}</option>`).join("")}</select></div><div class="field"><label>Receipt Note</label><textarea id="receiptNote" rows="3" placeholder="Optional note"></textarea></div><div class="modal-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">View Receipt</button></div></form>`)}
function receiptFromForm(e){e.preventDefault();generateReceipt(receiptTxn.value,receiptNote.value)}
function generateReceipt(id,note=""){
  const t=state.transactions.find(x=>x.id===id);
  if(!t)return;
  const itemRows=(t.items||[]).map(i=>`<tr><td>${escapeHtml(i.product)}</td><td>${i.quantity} ${escapeHtml(i.unit||"")}</td><td>${money(i.unitPrice)}</td><td>${money(i.quantity*i.unitPrice)}</td></tr>`).join("");
  openModal(`<div class="receipt-view">
    <div class="receipt-heading"><div><h2>Singin Connect</h2><p>Glass & Aluminum Supply</p></div><span class="receipt-icon">🧾</span></div>
    <h3>${state.role==="client"?"Quotation Request Summary":"Transaction Receipt"}</h3><p class="card-sub">Receipt details for your ${state.role==="client"?"quotation request":"transaction"}</p>
    <div class="receipt-details"><p><strong>${state.role==="client"?"Request No.":"Receipt No."}:</strong> ${escapeHtml(t.id)}</p><p><strong>Client:</strong> ${escapeHtml(t.client)}</p><p><strong>Date:</strong> ${dateFmt(t.date)}</p><p><strong>Payment:</strong> ${escapeHtml(t.paymentMethod||"Pending")}</p><p><strong>Status:</strong> ${escapeHtml(t.status)}</p></div>
    ${t.items?.length?`<div class="table-wrap"><table><thead><tr><th>Item</th><th>Qty</th><th>Unit Price</th><th>Subtotal</th></tr></thead><tbody>${itemRows}</tbody></table></div>`:`<div class="receipt-details"><p><strong>Product:</strong> ${escapeHtml(t.product)}</p><p><strong>Quantity:</strong> ${t.quantity}</p><p><strong>Unit Price:</strong> ${money(t.unitPrice)}</p></div>`}
    <div class="receipt-total"><span>Total Amount</span><strong>${money(t.amount)}</strong></div>
    ${note?`<p class="receipt-note">${escapeHtml(note)}</p>`:""}<p class="receipt-thanks">Thank you for choosing Singin Connect.</p>
    <div class="modal-actions receipt-actions"><button class="secondary" onclick="closeModal()">Done</button><button class="primary" onclick="printReceiptA4()">Print / Save PDF</button></div>
  </div>`);
}

function printReport(){document.body.classList.add('printing-report');window.print();document.body.classList.remove('printing-report');}
function printReceiptA4(){
 const receipt=document.querySelector(".receipt-view");
 if(!receipt){toast("Receipt is not open.");return}
 document.body.classList.add("printing-receipt");
 window.print();
 document.body.classList.remove("printing-receipt");
}

function revenuePeriodLabel(){const {year,month,last}=financialPeriod();return month==='all'?`January–${monthLabel(`${year}-${String(last).padStart(2,'0')}`)}`:monthLabel(`${year}-${month}`);}
function reportMetrics(){return financialReportMetrics();}
function revenueChart(){return financialRevenueChart();}
function turnoverChart(){const data=state.inventoryActivity||[],max=Math.max(1,...data.flatMap(x=>[Number(x.sold),Number(x.received)]));return data.length?'<div class="chart" role="img" aria-label="Recorded materials sold and received">'+data.map(x=>'<div class="bar-wrap"><div style="display:flex;gap:4px;align-items:flex-end;height:100%;width:100%"><div class="bar" title="Sold: '+Number(x.sold)+' '+escapeHtml(x.unit)+'" style="height:'+Math.max(0,Number(x.sold))/max*82+'%"></div><div class="bar alt" title="Received: '+Number(x.received)+' '+escapeHtml(x.unit)+'" style="height:'+Number(x.received)/max*82+'%"></div></div><div class="bar-label">'+escapeHtml(x.name)+'</div></div>').join('')+'</div><p class="card-sub">Blue: sold · Green: received. Quantities use each material’s unit; legacy movements were not recorded.</p>':'<div class="empty">No recorded inventory movements yet.</div>';}
function txnTable(arr,actions){return `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Client</th><th>Product</th><th>Qty</th><th>Amount</th><th>Date</th><th>Status</th>${actions?"<th>Action</th>":""}</tr></thead><tbody>${arr.map(t=>`<tr><td><strong>${escapeHtml(t.id)}</strong>${t.demoSeed?'<br><small>Fictional demo</small>':''}</td><td>${escapeHtml(t.client)}</td><td>${escapeHtml(t.product)}</td><td>${t.quantity}</td><td><strong>${money(t.amount)}</strong></td><td>${dateFmt(t.date)}</td><td>${badge(typeof paymentLabel==='function'?paymentLabel(t):t.status)}</td>${actions?`<td><div class="actions"><button class="icon-btn" onclick="viewTxn(${jsArg(t.id)})">View</button>${state.role==="client"?`<button class="icon-btn" onclick="generateReceipt(${jsArg(t.id)})">Receipt</button>`:""}</div></td>`:""}</tr>`).join("")||`<tr><td colspan="${actions?8:7}" class="empty">No transactions yet.</td></tr>`}</tbody></table></div>`}
function inventoryTable(arr){return `<div class="table-wrap"><table><thead><tr><th>SKU</th><th>Product</th><th>Category</th><th>Quantity</th><th>Unit</th><th>Price</th><th>Status</th><th>Action</th></tr></thead><tbody>${arr.map(i=>{let s=i.quantity===0?"Out of Stock":i.quantity<i.minStock?"Low Stock":"In Stock";return `<tr><td>${escapeHtml(i.sku)}</td><td><strong>${escapeHtml(i.name)}</strong></td><td>${escapeHtml(i.category)}</td><td>${i.quantity}</td><td>${escapeHtml(i.unit)}</td><td>${money(i.price)}</td><td>${badge(s)}</td><td><div class="actions"><button class="icon-btn" onclick="openInventory(${jsArg(i.id)})">Edit</button><button class="icon-btn" onclick="deleteInventory(${jsArg(i.id)})">Delete</button></div></td></tr>`}).join("")||'<tr><td colspan="8" class="empty">No inventory items yet.</td></tr>'}</tbody></table></div>`}
function clientTable(arr){return `<div class="table-wrap"><table><thead><tr><th>Client</th><th>Type</th><th>Contact</th><th>Email</th><th>Transactions</th><th>Total Spent</th><th>Last Transaction</th><th>Action</th></tr></thead><tbody>${arr.map(c=>`<tr><td><strong>${escapeHtml(c.name)}</strong><br><small style="color:#64748b">${escapeHtml(c.phone)}</small></td><td>${escapeHtml(c.type)}</td><td>${escapeHtml(c.contact)}</td><td>${escapeHtml(c.email)}</td><td>${c.transactions}</td><td>${money(c.totalSpent)}</td><td>${c.lastTransaction==="—"?"—":dateFmt(c.lastTransaction)}</td><td><button class="icon-btn" onclick="viewClient(${jsArg(c.id)})">View</button></td></tr>`).join("")||'<tr><td colspan="8" class="empty">No clients found.</td></tr>'}</tbody></table></div>`}
function filterTransactions(){let q=document.getElementById("txnSearch").value.toLowerCase(),f=document.getElementById("txnFilter").value;document.getElementById("txnTable").innerHTML=txnTable(state.transactions.filter(t=>(t.id+t.client+t.product).toLowerCase().includes(q)&&(f==="All"||t.status===f)),true)}
function filterInventory(){let q=document.getElementById("invSearch").value.toLowerCase(),f=document.getElementById("invFilter").value;document.getElementById("invTable").innerHTML=inventoryTable(state.inventory.filter(i=>(i.sku+i.name).toLowerCase().includes(q)&&(f==="All"||i.category===f)))}
function filterClients(){let q=document.getElementById("clientSearch").value.toLowerCase(),f=document.getElementById("clientFilter").value;document.getElementById("clientTable").innerHTML=clientTable(state.clients.filter(c=>(c.name+c.contact+c.email).toLowerCase().includes(q)&&(f==="All"||c.type===f)))}
function openTransaction(isClient=false){
  const defaultClient=isClient?clientData():null;
  openModal(`<h2>${isClient?"Request Quotation":"New Transaction"}</h2>
    <form onsubmit="addTransaction(event,${isClient})">
      <div class="form-grid">
        ${isClient
          ? `<div class="field wide"><label>Client</label><input value="${escapeHtml(defaultClient?.name||"")}" disabled></div>`
          : `<div class="field"><label>Client</label><select id="tClient" required><option value="">Select client</option>${state.clients.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}</select></div>`}
        <div class="field"><label>Payment Method</label><select id="tPayment"><option>Cash</option><option>Bank Transfer</option><option>Check</option><option>GCash</option><option>Maya</option></select></div>
        <div class="field"><label>Date</label><input id="tDate" type="date" value="${todayKey()}" ${isClient?`min="${todayKey()}"`:`max="${todayKey()}"`} required></div>
      </div>
      <div class="materials-box">
        <div class="materials-header"><div><strong>Materials</strong><div class="card-sub">Add multiple materials to one order. Submitted requests reserve available stock.</div></div><button type="button" class="secondary" onclick="addMaterialRow()">＋ Add Material</button></div>
        <div id="materialRows"></div>
      </div>
      <div class="field"><label>${isClient?"Request Notes / Special Instructions":"Order Notes / Special Instructions"}</label><textarea id="tNotes" rows="4" placeholder="Enter measurements, color, installation instructions, delivery details, or other notes..."></textarea></div>
      <div class="order-total-box"><span>Total Amount</span><strong id="tTotal">₱0.00</strong></div>
      <div class="modal-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">${isClient?"Submit Request":"Save Transaction"}</button></div>
    </form>`);
  addMaterialRow();
}
function addMaterialRow(){
  const rows=document.getElementById("materialRows"); if(!rows)return;
  const row=document.createElement("div"); row.className="material-row";
  row.innerHTML=`<div class="field"><label>Material</label><select class="material-product" onchange="updateTotal()" required><option value="">Select material</option>${state.inventory.filter(i=>i.quantity>0).map(i=>`<option value="${i.id}" data-price="${i.price}" data-unit="${escapeHtml(i.unit)}" data-stock="${i.quantity}">${escapeHtml(i.name)} — ${money(i.price)} / ${escapeHtml(i.unit)} (Stock: ${i.quantity})</option>`).join("")}</select></div>
  <div class="field"><label>Quantity</label><input class="material-qty" type="number" min="1" step="1" value="1" oninput="updateTotal()" required></div>
  <div class="field"><label>Unit Price</label><input class="material-unit-price" value="₱0.00" disabled></div>
  <div class="field material-line"><label>Line Total</label><input class="material-line-total" value="₱0.00" disabled></div>
  <button type="button" class="remove-material" onclick="removeMaterialRow(this)">×</button>`;
  rows.appendChild(row); updateTotal();
}
function updateTotal(){
  let total=0;
  document.querySelectorAll(".material-row").forEach(row=>{
    const select=row.querySelector(".material-product"), qty=+(row.querySelector(".material-qty")?.value||0), option=select?.selectedOptions[0];
    const price=+(option?.dataset.price||0), stock=+(option?.dataset.stock||0), line=qty*price;
    if(qty>stock&&option?.value)row.querySelector(".material-qty").setCustomValidity(`Only ${stock} available.`); else row.querySelector(".material-qty").setCustomValidity("");
    row.querySelector(".material-unit-price").value=money(price);
    row.querySelector(".material-line-total").value=money(line); total+=Math.round((line+Number.EPSILON)*100)/100;
  });
  const totalEl=document.getElementById("tTotal"); if(totalEl)totalEl.textContent=money(total);
}
async function addTransaction(e,isClient=false){
  e.preventDefault();
  const rows=[...document.querySelectorAll(".material-row")];
  const items=rows.map(row=>{const select=row.querySelector(".material-product"),option=select.selectedOptions[0];return {productId:+select.value,product:option?.textContent.split(" — ")[0]||"",quantity:+row.querySelector(".material-qty").value,unitPrice:+(option?.dataset.price||0),unit:option?.dataset.unit||"",stock:+(option?.dataset.stock||0)}}).filter(x=>x.productId);
  if(!items.length){toast("Please add at least one material.");return}
  if(items.some(i=>!validDecimal(i.quantity,0.01))){toast("Each quantity must be 0.01–1,000,000 with at most two decimals.");return}
  const totals={}; items.forEach(i=>totals[i.productId]=(totals[i.productId]||0)+i.quantity);
  for(const item of items)if(totals[item.productId]>item.stock){toast(`Not enough stock for ${escapeHtml(item.product)}. Available: ${item.stock} ${escapeHtml(item.unit)}`);return}
  const client=isClient?clientData():state.clients.find(c=>String(c.id)===document.getElementById("tClient").value);
  if(!client){toast('Please select a client');return;}const orderDate=document.getElementById('tDate').value;if(!orderDate||(isClient?orderDate<todayKey():orderDate>todayKey())){toast(isClient?'Choose today or a future requested date.':'Choose today or an earlier transaction date.');return;}
  if(!DEMO_MODE){const result=await commitChange('createTransaction',{clientId:client.id,items,date:document.getElementById('tDate').value,notes:document.getElementById('tNotes').value.trim(),paymentMethod:document.getElementById('tPayment').value},e);if(!result)return;closeModal();render();toast(isClient?'Quotation request saved; materials reserved':'Transaction saved to MySQL');generateReceipt(result.id);return;}
  const amount=items.reduce((sum,item)=>sum+item.quantity*item.unitPrice,0), id=newId("TXN-"), date=document.getElementById("tDate").value, notes=document.getElementById("tNotes").value.trim();
  state.transactions.unshift({id,clientId:client.id,client:client.name,product:items.map(i=>i.product).join(", "),items:items.map(({stock,...item})=>item),quantity:items.reduce((sum,i)=>sum+i.quantity,0),unitPrice:items.length===1?items[0].unitPrice:0,amount,date,notes,status:isClient?"Pending":"Paid",paymentMethod:document.getElementById("tPayment").value});
  items.forEach(item=>{const inventory=state.inventory.find(i=>i.id===item.productId);if(inventory)inventory.quantity-=item.quantity});
  save(); closeModal(); toast(isClient?"Quotation request submitted successfully":"Transaction saved and inventory updated"); render();
  // Show the receipt immediately after a successful order/transaction.
  generateReceipt(id, isClient ? "Quotation request confirmation — payment status: Pending" : "Transaction receipt");
}
function viewTxn(id){
  let t=state.transactions.find(x=>x.id===id); if(!t)return;
  const canManage=state.role==="admin";
  const itemRows=(t.items||[]).map(i=>`<tr><td>${escapeHtml(i.product)}</td><td>${i.quantity} ${escapeHtml(i.unit||"")}</td><td>${money(i.unitPrice)}</td><td>${money(i.quantity*i.unitPrice)}</td></tr>`).join("");
  const itemsHtml=t.items?.length?`<div class="table-wrap" style="margin-top:12px"><table><thead><tr><th>Material</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>${itemRows}</tbody></table></div>`:`<p><strong>Product:</strong> ${escapeHtml(t.product)}</p>`;
  openModal(`<h2>Transaction ${escapeHtml(t.id)}</h2><div class="details"><p><strong>Client:</strong> ${escapeHtml(t.client)}</p>${itemsHtml}<p><strong>Amount:</strong> ${money(t.amount)}</p><p><strong>Date:</strong> ${dateFmt(t.date)}</p><p><strong>Payment status:</strong> ${badge(typeof paymentLabel==='function'?paymentLabel(t):t.status)}</p><p><strong>Payment:</strong> ${escapeHtml(t.paymentMethod||"—")}</p>${t.notes?`<p><strong>Notes:</strong> ${escapeHtml(t.notes)}</p>`:""}</div>${canManage?`<div class="field"><label>Update Status</label><select id="txnStatus"><option ${t.status==="Pending"?"selected":""}>Pending</option><option ${t.status==="Paid"?"selected":""}>Paid</option><option ${t.status==="Overdue"?"selected":""}>Overdue</option><option ${t.status==="Cancelled"?"selected":""}>Cancelled</option></select></div><div class="modal-actions"><button class="secondary" onclick="closeModal()">Close</button><button class="primary" onclick="updateTransactionStatus(${jsArg(t.id)})">Update Status</button></div>`:`<div class="modal-actions"><button class="primary" onclick="closeModal()">Close</button></div>`}`)
}
async function updateTransactionStatus(id){
 const t=state.transactions.find(x=>x.id===id);if(!t||state.role!=='admin')return;const next=document.getElementById('txnStatus').value;
 if(!DEMO_MODE){if(!await commitChange('transactionStatus',{id,status:next}))return;}
 else{
  if(!['Paid','Pending','Overdue','Cancelled'].includes(next))return;
  const wasReserved=t.stockReserved??t.status!=='Cancelled',reserve=next!=='Cancelled';
  if(wasReserved!==reserve){const totals=new Map();for(const item of t.items||[])totals.set(item.productId,(totals.get(item.productId)||0)+Number(item.quantity));if(!totals.size){toast('Material lines are missing; reconcile this record first.');return;}
   for(const [pid,qty] of totals){const p=state.inventory.find(i=>String(i.id)===String(pid));if(!p||reserve&&p.quantity<qty){toast('Insufficient or missing stock; status unchanged.');return;}}
   for(const [pid,qty] of totals)state.inventory.find(i=>String(i.id)===String(pid)).quantity+=reserve?-qty:qty;
  }t.stockReserved=reserve;t.status=next;save();
 }closeModal();toast('Transaction status updated');render();
}

function negotiationPage(isClient){
  const me=isClient?(clientData()?.name||""):null;
  const list=state.negotiations.filter(n=>!isClient||belongsTo(n,clientData())).slice().sort((a,b)=>(b.updated||"").localeCompare(a.updated||""));
  const open=list.filter(n=>!['Accepted','Rejected'].includes(n.status)).length;
  return `<section class="content"><div class="page-head"><div><h1>${isClient?'Negotiation Center':'Client Negotiations'}</h1><p>${isClient?'Discuss pricing, quantities, and order terms directly with the administrator.':'Review client offers, send counter offers, and finalize order terms.'}</p></div>${isClient?'<button class="primary" onclick="openNegotiation()">＋ New Negotiation</button>':'<div class="card" style="padding:9px 13px"><strong>'+open+'</strong> <span style="color:var(--muted);font-size:11px">open negotiations</span></div>'}</div><div class="grid kpi-grid"><div class="card kpi"><div class="label">Open Negotiations</div><div class="value">${open}</div></div><div class="card kpi"><div class="label">Accepted</div><div class="value">${list.filter(n=>n.status==='Accepted').length}</div></div><div class="card kpi"><div class="label">Counter Offers</div><div class="value">${list.filter(n=>n.status==='Counter Offer').length}</div></div><div class="card kpi"><div class="label">Total Threads</div><div class="value">${list.length}</div></div></div><div class="negotiation-list">${list.map(n=>negotiationCard(n,isClient)).join('')||'<div class="card empty" style="padding:45px">No negotiations yet.</div>'}</div></section>`;
}
function negotiationCard(n,isClient){
  const offer=n.lastBy==='Client'?n.clientOffer:n.adminOffer, canRespond=!['Accepted','Rejected'].includes(n.status);
  return `<div class="card negotiation-card"><div class="neg-head"><div><span class="neg-id">${escapeHtml(n.id)}</span><h3>${escapeHtml(n.subject)}</h3><p>${isClient?'Administrator':'Client'}: <strong>${escapeHtml(n.client)}</strong> · Qty ${n.quantity||'—'} · ${escapeHtml(n.relatedOrder||'')}</p></div>${badge(n.status)}</div><div class="neg-body"><div class="neg-message"><small>Latest message · ${escapeHtml(n.lastBy||'—')}</small><p>${escapeHtml(n.message||'No message')}</p></div><div class="offer-box"><small>Latest proposed unit price</small><strong>${money(offer||0)}</strong><span>${escapeHtml(n.lastBy||'—')} proposal</span></div></div><div class="neg-footer"><small>Updated ${n.updated?manilaDateTime(n.updated):'—'}</small><div class="modal-actions">${canRespond?`<button class="secondary" onclick="openNegotiation(${jsArg(n.id)})">Respond / View</button>`:''}${canRespond&&n.lastBy!==(isClient?'Client':'Admin')?`<button class="primary" onclick="acceptNegotiation(${jsArg(n.id)})">Accept Terms</button>`:''}</div></div></div>`;
}
function openNegotiation(id=''){
  const existing=id?state.negotiations.find(n=>String(n.id)===String(id)):null, isClient=state.role==='client';
  if(existing){
    const latest=Number(existing.lastBy==='Client'?existing.clientOffer:existing.adminOffer)||0;
    openModal(`<h2>${escapeHtml(existing.subject)}</h2><p><strong>Client:</strong> ${escapeHtml(existing.client)}</p><p><strong>Client offer:</strong> ${money(existing.clientOffer||0)} &nbsp; <strong>Admin offer:</strong> ${existing.adminOffer==null?"Not yet proposed":money(existing.adminOffer)}</p><div class="thread-message"><small>Latest message · ${escapeHtml(existing.lastBy||'—')}</small><p>${escapeHtml(existing.message||'—')}</p></div><form onsubmit="sendNegotiationResponse(event,${jsArg(existing.id)})"><div class="form-grid"><div class="field"><label>Your ${isClient?'offer':'counter offer'} / unit price</label><input id="negOffer" type="number" min="0.01" max="10000000" step="0.01" value="${latest||''}" required></div><div class="field"><label>Quantity</label><input id="negQty" type="number" min="1" max="1000000" step="1" value="${existing.quantity||1}" required></div><div class="field wide"><label>Your message</label><textarea id="negMessage" rows="4" required></textarea></div></div><div class="modal-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button>${existing.lastBy!==(isClient?'Client':'Admin')?`<button type="button" class="secondary" onclick="acceptNegotiation(${jsArg(existing.id)})">Accept Terms</button>`:''}<button type="submit" class="primary">${isClient?'Send Offer':'Send Counter Offer'}</button></div></form>`);return;
  }
  if(!isClient){toast('Select an existing client negotiation to respond.');return}
  const tx=clientTransactions().filter(t=>t.status!=='Cancelled'); if(!tx.length){toast('Create an order first before starting a negotiation.');return}
  openModal(`<h2>Start a Negotiation</h2><form onsubmit="createNegotiation(event)"><div class="form-grid"><div class="field wide"><label>Related Order</label><select id="negOrder" required><option value="">Select an order</option>${tx.map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(t.id)} · ${escapeHtml(t.product||'Multiple materials')} · ${money(t.amount)}</option>`).join('')}</select></div><div class="field"><label>Subject</label><input id="negSubject" required></div><div class="field"><label>Quantity</label><input id="negQty" type="number" min="1" max="1000000" step="1" value="1" required></div><div class="field"><label>Your proposed unit price</label><input id="negOffer" type="number" min="0.01" max="10000000" step="0.01" required></div><div class="field wide"><label>Message to Admin</label><textarea id="negMessage" rows="4" required></textarea></div></div><div class="modal-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button type="submit" class="primary">Send Negotiation</button></div></form>`);
}
async function createNegotiation(e){
 e.preventDefault();const c=clientData(),order=document.getElementById('negOrder')?.value,subject=document.getElementById('negSubject')?.value.trim(),qty=Number(document.getElementById('negQty')?.value),price=Number(document.getElementById('negOffer')?.value),msg=document.getElementById('negMessage')?.value.trim();
 if(!c||!order||!subject||!Number.isInteger(qty)||qty<1||qty>1000000||!Number.isFinite(price)||price<=0||price>10000000||!msg){toast('Please complete all negotiation fields.');return}
 if(!DEMO_MODE){if(!await commitChange('createNegotiation',{relatedOrder:order,subject,quantity:qty,clientOffer:price,message:msg},e))return;closeModal();render();toast('Negotiation saved');return;}
 state.negotiations.unshift({id:newId('NEG-'),clientId:c.id,client:c.name,subject,relatedOrder:order,clientOffer:price,adminOffer:0,quantity:qty,message:msg,status:'Client Offer',lastBy:'Client',updated:new Date().toISOString()});save();closeModal();toast('Negotiation sent to administrator');render();
}
async function sendNegotiationResponse(e,id){
 e.preventDefault();const n=state.negotiations.find(x=>String(x.id)===String(id));if(!n){toast('Negotiation not found');return}
 const price=Number(document.getElementById('negOffer')?.value),qty=Number(document.getElementById('negQty')?.value),msg=(document.getElementById('negMessage')?.value||'').trim();
 if(!Number.isFinite(price)||price<=0||price>10000000||!Number.isInteger(qty)||qty<1||qty>1000000||!msg){toast('Please enter a valid price, quantity, and message.');return}
 if(!DEMO_MODE){if(!await commitChange('respondNegotiation',{id,offer:price,quantity:qty,message:msg},e))return;closeModal();render();toast('Offer saved');return;}
 const isClient=state.role==='client';if(isClient)n.clientOffer=price;else n.adminOffer=price;n.quantity=qty;n.message=msg;n.lastBy=isClient?'Client':'Admin';n.status=isClient?'Client Offer':'Counter Offer';n.updated=new Date().toISOString();save();closeModal();toast(isClient?'Offer sent to administrator':'Counter offer sent to client');render();
}
async function acceptNegotiation(id){
 const n=state.negotiations.find(x=>String(x.id)===String(id));if(!n){toast('Negotiation not found');return}
 if(n.lastBy===(state.role==='client'?'Client':'Admin')){toast('Waiting for the administrator to respond to your offer.');return}
 const agreed=Number(n.lastBy==='Client'?n.clientOffer:n.adminOffer)||Number(n.adminOffer)||Number(n.clientOffer);if(!agreed){toast('There is no valid offer to accept.');return}
 if(!DEMO_MODE){if(!await commitChange('acceptNegotiation',{id}))return;closeModal();render();toast('Terms accepted. Order prices remain unchanged until separately agreed.');return;}
 n.status='Accepted';n.updated=new Date().toISOString();save();closeModal();toast('Negotiation accepted — terms agreed');render();
}
function openInventory(id){let x=id?state.inventory.find(i=>i.id===id):null;openModal(`<h2>${x?"Edit":"Add"} Inventory Item</h2><form onsubmit="saveInventory(event,${jsArg(id||0)})"><div class="form-grid"><div class="field"><label>SKU</label><input id="iSku" value="${escapeHtml(x?.sku||"")}" required></div><div class="field"><label>Product Name</label><input id="iName" value="${escapeHtml(x?.name||"")}" required></div><div class="field"><label>Category</label><select id="iCat">${["Glass","Aluminum","Hardware","Accessories"].map(c=>`<option ${x?.category===c?"selected":""}>${c}</option>`).join("")}</select></div><div class="field"><label>Unit</label><select id="iUnit">${["sq.m","pcs","tubes","rolls","sets"].map(c=>`<option ${x?.unit===c?"selected":""}>${c}</option>`).join("")}</select></div><div class="field"><label>Quantity</label><input id="iQty" type="number" min="0" step="0.01" value="${x?.quantity||0}"></div><div class="field"><label>Price</label><input id="iPrice" type="number" min="0.01" step="0.01" value="${x?.price||0}"></div><div class="field"><label>Minimum Stock</label><input id="iMin" type="number" min="0" step="0.01" value="${x?.minStock??10}"></div></div><div class="modal-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save Item</button></div></form>`)}
async function saveInventory(e,id){e.preventDefault();const quantity=Number(iQty.value),price=Number(iPrice.value),minStock=Number(iMin.value);if(!Number.isFinite(quantity)||quantity<0||quantity>1000000||!Number.isFinite(price)||price<=0||price>10000000||!Number.isFinite(minStock)||minStock<0||minStock>1000000){toast("Use valid values within the allowed limits.");return}let x={id:id||0,sku:iSku.value,name:iName.value,category:iCat.value,unit:iUnit.value,quantity,price,minStock};if(!validDecimal(quantity)||!validDecimal(price,0.01,10000000)||!validDecimal(minStock)){toast("Use at most two decimals for inventory values.");return;}if(!x.sku.trim()||!x.name.trim()){toast('SKU and product name are required.');return;}if(!DEMO_MODE){if(!await commitChange('saveInventory',x,e))return;closeModal();render();toast('Inventory saved');return;}if(state.inventory.some(i=>i.sku.toLowerCase()===x.sku.toLowerCase()&&i.id!==id)){toast('SKU already exists');return;}if(id)state.inventory=state.inventory.map(i=>i.id===id?x:i);else {x.id=newNumericId();state.inventory.push(x);}save();closeModal();toast("Inventory saved");render()}
async function deleteInventory(id){if(state.role!=='admin'||!confirm('Delete this inventory item?'))return;if(!DEMO_MODE){if(!await commitChange('deleteInventory',{id}))return;}else{if(state.transactions.some(t=>t.items?.some(i=>String(i.productId)===String(id)))){toast('This material has transaction history and must be retained.');return;}state.inventory=state.inventory.filter(i=>i.id!==id);save();}render();toast('Item deleted');}

function openClient(){openModal(`<h2>Add Client</h2><form onsubmit="addClient(event)"><div class="form-grid"><div class="field"><label>Client / Company Name</label><input id="cName" required></div><div class="field"><label>Type</label><select id="cType"><option>Business</option><option>Individual</option></select></div><div class="field"><label>Contact Person</label><input id="cContact" required></div><div class="field"><label>Email</label><input id="cEmail" type="email" required></div><div class="field"><label>Phone</label><input id="cPhone"></div><div class="field"><label>Address</label><input id="cAddress"></div></div><div class="modal-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save Client</button></div></form>`)}
async function addClient(e){e.preventDefault();const client={name:cName.value.trim(),type:cType.value,contact:cContact.value.trim(),email:cEmail.value.trim().toLowerCase(),phone:cPhone.value.trim(),address:cAddress.value.trim()};if(!client.name||!client.contact||!client.email){toast('Name, contact and email are required.');return;}if(!DEMO_MODE){if(!await commitChange('addClient',client,e))return;}else{if(state.clients.some(c=>c.email.toLowerCase()===client.email)){toast('Email already exists');return;}state.clients.push({id:newNumericId(),...client,transactions:0,totalSpent:0,lastTransaction:null});save();}closeModal();toast('Client added. Classroom password: clientdemo');render();}

function viewClient(id){let c=state.clients.find(x=>x.id===id);if(!c)return;openModal(`<h2>${escapeHtml(c.name)}</h2><p><strong>Type:</strong> ${escapeHtml(c.type)}</p><p><strong>Contact:</strong> ${escapeHtml(c.contact)}</p><p><strong>Email:</strong> ${escapeHtml(c.email)}</p><p><strong>Phone:</strong> ${escapeHtml(c.phone)}</p><p><strong>Address:</strong> ${escapeHtml(c.address)}</p><p><strong>Total spent:</strong> ${money(c.totalSpent)}</p>`)}

function manageSchedule(id){
 const item=state.schedules.find(s=>String(s.id)===String(id));
 if(!item){toast("Schedule not found");return}
 openModal(`<h2>Manage Schedule</h2><p class="card-sub">${escapeHtml(item.service)} · ${escapeHtml(item.client)}</p><form onsubmit="updateSchedule(event,${jsArg(item.id)})"><div class="form-grid"><div class="field"><label>Date</label><input type="date" id="editScheduleDate" value="${item.date}" required></div><div class="field"><label>Time</label><input type="time" id="editScheduleTime" value="${item.time||"09:00"}" required></div><div class="field wide"><label>Status</label><select id="editScheduleStatus">${["Pending","Confirmed","Completed","Cancelled"].map(status=>`<option ${item.status===status?"selected":""}>${status}</option>`).join("")}</select></div><div class="field wide"><label>Address</label><input id="editScheduleAddress" value="${String(item.address||"").replace(/&/g,"&amp;").replace(/"/g,"&quot;")}"></div><div class="field wide"><label>Notes</label><textarea id="editScheduleNotes" rows="3">${String(item.notes||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</textarea></div></div><div class="modal-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save Changes</button></div></form>`);
}
async function updateSchedule(event,id){
 event.preventDefault();const item=state.schedules.find(s=>String(s.id)===String(id));if(!item||state.role!=='admin')return;
 const input={id,date:document.getElementById('editScheduleDate').value,time:document.getElementById('editScheduleTime').value,status:document.getElementById('editScheduleStatus').value,end:document.getElementById('editScheduleEnd')?.value||'',address:document.getElementById('editScheduleAddress').value,notes:document.getElementById('editScheduleNotes').value};
 if(!DEMO_MODE){if(!await commitChange('updateSchedule',input,event))return;}else{if((input.date!==item.date||input.time!==item.time)&&!validateDemoSchedule(item.clientId,input.date,input.time,id))return;Object.assign(item,input);save();}
 invalidateClientScheduleCache();closeModal();render();toast('Schedule updated');
}

function openSchedule(){openModal(`<h2>New Schedule</h2><form onsubmit="addSchedule(event)"><div class="form-grid"><div class="field"><label>Client</label><select id="sClient" required><option value="">Select client</option>${state.clients.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}</select></div><div class="field"><label>Service</label><select id="sService">${["Glass Installation","Aluminum Fabrication","Delivery","Site Measurement","Repair"].map(x=>`<option>${x}</option>`).join("")}</select></div><div class="field"><label>Date</label><input id="sDate" type="date" min="${todayKey()}" required></div><div class="field"><label>Time</label><input id="sTime" type="time" value="09:00"></div><div class="field wide"><label>Address</label><input id="sAddress"></div><div class="field wide"><label>Notes</label><textarea id="sNotes" rows="3"></textarea></div></div><div class="modal-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save Schedule</button></div></form>`)}
async function addSchedule(e){e.preventDefault();const client=state.clients.find(c=>String(c.id)===sClient.value);if(!client){toast('Select a client.');return;}const input={clientId:client.id,service:sService.value,date:sDate.value,time:sTime.value,address:sAddress.value.trim(),notes:sNotes.value.trim()};if(!input.address){toast('Address is required.');return;}if(!DEMO_MODE){if(!await commitChange('addSchedule',input,e))return;}else{if(!validateDemoSchedule(client.id,input.date,input.time))return;state.schedules.unshift({id:newNumericId(),client:client.name,status:'Pending',...input});save();}invalidateClientScheduleCache();closeModal();render();toast('Schedule saved');}

function clientCalendar(eventsByDateInput){
  const mine=clientSchedules();
  const y=clientCalendarDate.getFullYear(), m=clientCalendarDate.getMonth();
  const first=new Date(y,m,1).getDay(), days=new Date(y,m+1,0).getDate();
  const todayKeyValue=todayKey();
  const sc=mine;
  const eventsByDate=eventsByDateInput||clientScheduleCache.index;
  let cells=[];
  const prevDays=new Date(y,m,0).getDate();
  for(let i=first-1;i>=0;i--){const d=prevDays-i;cells.push(`<button type="button" class="client-day other-month" onclick="selectClientCalendarDate('')"><span class="day-number">${d}</span></button>`)}
  for(let d=1;d<=days;d++){
    const date=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const events=eventsByDate[date]||[];
    const cls=`client-day ${date===todayKeyValue?"today":""} ${date===selectedClientCalendarDate?"selected":""}`;
    cells.push(`<button type="button" class="${cls}" onclick="selectClientCalendarDate('${date}')"><span class="day-number">${d}</span>${events.length?`<span class="event-pill">${events.length} ${events.length===1?"schedule":"schedules"}</span>`:`<span class="day-spacer"></span>`}${events.slice(0,2).map(x=>`<span class="client-event-dot" title="${escapeHtml(x.service)}"></span>`).join("")}</button>`);
  }
  for(let i=1;cells.length<42;i++,cells.push(`<button type="button" class="client-day other-month" onclick="selectClientCalendarDate('')"><span class="day-number">${i}</span></button>`)){}
  const label=clientCalendarDate.toLocaleDateString("en-US",{month:"long",year:"numeric"});
  return `<div class="calendar-toolbar"><div><div class="calendar-month-title">${label}</div><div class="calendar-month-sub">Select a date to view its schedule</div></div><div class="calendar-controls"><button type="button" class="today-btn" onclick="goToClientCalendarToday()">Today</button><button type="button" class="calendar-arrow" aria-label="Previous month" onclick="changeClientCalendar(-1)">‹</button><button type="button" class="calendar-arrow" aria-label="Next month" onclick="changeClientCalendar(1)">›</button></div></div><div class="client-calendar-scroll"><div class="calendar client-calendar-grid">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>`<div class="day-name">${x}</div>`).join("")}${cells.join("")}</div></div>`;
}
function clientCalendarEvents(date,sc=clientSchedules()){
  if(!date)return '<div class="agenda-empty"><span>📅</span><strong>Select a date</strong><small>Choose a date from the calendar to see appointments and details.</small></div>';
  const events=sc.filter(x=>x.date===date);
  if(!events.length)return `<div class="agenda-empty"><span>✓</span><strong>No schedule</strong><small>There are no appointments on ${dateFmt(date)}.</small><button class="secondary" onclick="openClientSchedule('${date}')">＋ Request on this date</button></div>`;
  events.sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  return `<div class="selected-date-label">${dateFmt(date)}</div><div class="agenda-list">${events.map(x=>`<div class="agenda-item"><div class="agenda-time">${timeLabel(x.time)}</div><div class="agenda-info"><strong>${escapeHtml(x.service)}</strong><small>${escapeHtml(x.address||"No address provided")}</small>${x.notes?`<p>${escapeHtml(x.notes)}</p>`:""}</div><div>${badge(x.status)}</div></div>`).join("")}</div>`;
}
function todayKey(){const parts=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return `${parts.year}-${parts.month}-${parts.day}`;}
function refreshClientCalendarOnly(fromStorage=false){
  if(state.role!=="client" || state.page!=="Calendar") return;
  const card=document.querySelector(".client-calendar-card");
  const agenda=document.getElementById("selectedCalendarEvents");
  if(!card || !agenda){
    if(!fromStorage) render();
    return;
  }

  const schedules=clientSchedules();
  card.innerHTML=clientCalendar(clientScheduleCache.index);
  agenda.innerHTML=clientCalendarEvents(selectedClientCalendarDate,schedules);
}
function selectClientCalendarDate(date){
  if(!date || date===selectedClientCalendarDate) return;
  selectedClientCalendarDate=date;
  refreshClientCalendarOnly();
}
function changeClientCalendar(step){
  const nextMonth=new Date(clientCalendarDate.getFullYear(),clientCalendarDate.getMonth()+Number(step),1);
  if(Number.isNaN(nextMonth.getTime())) return;
  clientCalendarDate=nextMonth;
  selectedClientCalendarDate="";
  refreshClientCalendarOnly();
}
function goToClientCalendarToday(){
  const today=new Date(todayKey()+'T12:00:00');
  clientCalendarDate=new Date(today.getFullYear(),today.getMonth(),1);
  selectedClientCalendarDate=todayKey();
  refreshClientCalendarOnly();
}
function openClientSchedule(prefillDate=selectedClientCalendarDate||""){
  const c=clientData();
  if(!c){toast("Client account not found");return}
  openModal(`<h2>Request a Schedule</h2><p class="card-sub">Choose your preferred appointment date and service. Your request will be marked Pending.</p><form onsubmit="addClientSchedule(event)"><div class="form-grid"><div class="field"><label>Service</label><select id="csService">${["Glass Installation","Aluminum Fabrication","Delivery","Site Measurement","Repair"].map(x=>`<option>${x}</option>`).join("")}</select></div><div class="field"><label>Preferred Date</label><input id="csDate" type="date" min="${todayKey()}" value="${prefillDate>=todayKey()?prefillDate:""}" required></div><div class="field"><label>Preferred Time</label><input id="csTime" type="time" value="09:00" required></div><div class="field"><label>Address</label><input id="csAddress" value="${escapeHtml(c.address||"")}" required></div><div class="field wide"><label>Notes / Special Instructions</label><textarea id="csNotes" rows="4" placeholder="Tell us what you need..." ></textarea></div></div><div class="modal-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Submit Request</button></div></form>`);
}
async function addClientSchedule(e){
  e.preventDefault();
  const date=document.getElementById("csDate")?.value;
  const time=document.getElementById("csTime")?.value;
  const service=document.getElementById("csService")?.value;
  const address=document.getElementById("csAddress")?.value.trim();
  const notes=document.getElementById("csNotes")?.value.trim()||"";
  const client=clientData();
  if(!client || !date || !time || !service || !address){toast("Please complete the required schedule details.");return}
  if(date<todayKey()){toast("Choose today or a future date for your schedule request.");return}
  const duplicate=state.schedules.some(x=>belongsTo(x,client) && x.date===date && x.time===time && x.status!=="Cancelled");
  if(duplicate){toast("You already have an appointment at this time.");return}
  if(!DEMO_MODE){if(!await commitChange('addSchedule',{clientId:client.id,service,date,time,address,notes},e))return;invalidateClientScheduleCache();closeModal();render();toast('Schedule request saved');return;}
  if(!validateDemoSchedule(client.id,date,time))return;
  state.schedules.unshift({id:newNumericId(),clientId:client.id,client:client.name,service,date,time,status:'Pending',address,notes});
  invalidateClientScheduleCache();
  
  clientCalendarDate=new Date(date+"T00:00:00");
  selectedClientCalendarDate=date;
  save(); closeModal(); toast("Schedule request submitted"); render();
}
// Calendar rendering is kept lightweight: build one date index instead of
// filtering the full schedule array once for every day, and refresh only the
// calendar card when the month changes.
function buildScheduleIndex(){
  const index=Object.create(null);
  for(const item of state.schedules){
    if(!item || item.status==="Cancelled" || !item.date) continue;
    (index[item.date] ||= []).push(item);
  }
  for(const date in index){
    index[date].sort((a,b)=>(a.time||"").localeCompare(b.time||""));
  }
  return index;
}
function calendar(){
 const y=adminCalendarDate.getFullYear(),m=adminCalendarDate.getMonth();
 const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),today=todayKey();
 const byDate=buildScheduleIndex(),cells=[];
 for(let i=0;i<first;i++)cells.push('<div class="day other"></div>');
 for(let d=1;d<=days;d++){
   const date=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
   const ss=byDate[date]||[];
   cells.push(`<button type="button" class="day ${date===today?'today':''}" onclick="openCalendarDate('${date}')"><strong>${d}</strong>${ss.slice(0,3).map(x=>`<span class="schedule-chip">${x.time||''} · ${escapeHtml(x.client||'')}</span>`).join('')}${ss.length>3?`<span class="schedule-chip">+${ss.length-3} more</span>`:''}</button>`);
 }
 while(cells.length<42)cells.push('<div class="day other"></div>');
 const label=adminCalendarDate.toLocaleDateString('en-US',{month:'long',year:'numeric'});
 return `<div class="calendar-head"><button type="button" onclick="changeAdminCalendar(-1)">‹</button><strong>${label}</strong><div style="display:flex;gap:6px"><button type="button" onclick="goToAdminCalendarToday()">Today</button><button type="button" onclick="changeAdminCalendar(1)">›</button></div></div><div class="calendar-wrap"><div class="calendar">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=>`<div class="day-name">${x}</div>`).join('')}${cells.join('')}</div></div>`;
}
function refreshAdminCalendarOnly(){
  const card=document.querySelector(".admin-calendar-card");
  if(card) card.innerHTML=calendar();
  else render();
}
function changeAdminCalendar(step){
  adminCalendarDate=new Date(adminCalendarDate.getFullYear(),adminCalendarDate.getMonth()+step,1);
  refreshAdminCalendarOnly();
}
function goToAdminCalendarToday(){
  const d=new Date(todayKey()+'T12:00:00');
  adminCalendarDate=new Date(d.getFullYear(),d.getMonth(),1);
  refreshAdminCalendarOnly();
}
function openCalendarDate(date){
  const byDate=buildScheduleIndex();
  const items=byDate[date]||[];
  openModal(`<h2>Schedules — ${dateFmt(date)}</h2>${items.length?items.map(x=>`<div class="quick-item" style="margin-bottom:8px"><div><strong>${escapeHtml(x.service)}</strong><small>${timeLabel(x.time)} · ${escapeHtml(x.client)}<br>${escapeHtml(x.address||'No address')}<br>${escapeHtml(x.notes||'')}</small></div>${badge(x.status)}</div>`).join(''):'<div class="empty" style="padding:25px">No schedules on this date.</div>'}<div class="modal-actions"><button class="primary" onclick="closeModal()">Close</button></div>`);
}

