// Reuse existing account/profile/calendar screens; shared availability API enforces ownership.
const v8Profile=pages.Profile;
pages.Profile=function(){let html=v8Profile();if(['admin','staff'].includes(state.role))html=html.replace('</section>',weeklyHoursCard(state.account.id)+'</section>');return html;};
function weeklyHoursCard(id){
  const owner=state.role==='admin';
  return `<div class="card weekly-hours"><div class="page-head"><div><h2>Weekly working hours</h2><p>Weekly defaults apply unless a dated working period overrides them. Time off always takes priority.</p></div></div>${owner?`<label>Personnel <select id="weeklyPerson" onchange="document.querySelector('.weekly-editor').innerHTML=weeklyEditor(this.value)">${(state.personnel||[]).filter(p=>p.status==='active').map(p=>`<option value="${p.id}" ${Number(p.id)===Number(id)?'selected':''}>${escapeHtml(p.name)}</option>`).join('')}</select></label>`:''}<div class="weekly-editor">${weeklyEditor(id)}</div><button class="secondary" onclick="openPersonalAvailability()">Add dated hours / time off</button></div>`;
}
function weeklyEditor(id){
  const rows=(state.weeklyHours||[]).filter(r=>Number(r.staffId)===Number(id));
  return `<form onsubmit="saveWeeklyForm(event,${Number(id)})"><div class="weekly-grid">${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day,i)=>{const r=rows.find(r=>Number(r.weekday)===i)||{working:i!==0,start:'08:00',end:'17:00'};return `<div class="weekly-day" role="group" aria-label="${day} working hours"><label><input type="checkbox" name="working${i}" ${Number(r.working)?'checked':''} onchange="this.closest('.weekly-day').querySelectorAll('.time-editor select').forEach(s=>s.disabled=!this.checked)"> ${day}</label><div class="field"><label>Start</label><input name="start${i}" type="time" value="${r.start||'08:00'}" ${Number(r.working)?'':'disabled'}></div><div class="field"><label>End</label><input name="end${i}" type="time" value="${r.end||'17:00'}" ${Number(r.working)?'':'disabled'}></div></div>`;}).join('')}</div><p class="card-sub">Hours cannot overlap midnight. Reassign conflicting appointments before reducing hours. Dated adjustments remain intact.</p><button class="primary">Save weekly hours</button></form>`;
}
async function saveWeeklyForm(event,id){event.preventDefault();const f=event.currentTarget,days=Array.from({length:7},(_,i)=>({working:f.elements['working'+i].checked,start:f.elements['start'+i].value,end:f.elements['end'+i].value}));if(await commitChange('saveWeeklyHours',{staffId:id,days},event)){render();toast('Weekly working hours saved');}}
const v8PersonalAvailability=openPersonalAvailability;
openPersonalAvailability=function(id=0){v8PersonalAvailability(id);if(!id&&state.role==='admin'){const form=document.querySelector('#modalContent form'),person=document.createElement('div');person.className='field';person.innerHTML=`<label>Personnel</label><select name="staffId">${state.personnel.filter(p=>p.status==='active').map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}</select>`;form.prepend(person);person.querySelector('select').value=document.getElementById('weeklyPerson')?.value||state.account.id;}};
// Existing Owner-only date card is now available to staff through the same form/API.
const v8StaffProfile=staffPages.Profile;
staffPages.Profile=()=>pages.Profile();
