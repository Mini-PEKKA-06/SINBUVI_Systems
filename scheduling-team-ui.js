// Team assignment extends the existing booking/calendar screens.
function personnelAvailability(person,schedule,end){
  if(person.status!=='active')return 'Account inactive';
  if(!end||end<=schedule.time)return 'Choose an end time after the start';
  const periods=(state.availability||[]).filter(a=>String(a.staffId)===String(person.id)&&a.date===schedule.date);
  const dated=periods.filter(a=>a.type==='Available');const weekday=new Date(schedule.date+'T12:00:00+08:00').getUTCDay();const weekly=(state.weeklyHours||[]).filter(a=>String(a.staffId)===String(person.id)&&Number(a.weekday)===weekday&&Number(a.working)===1);
  if(!(dated.length?dated:weekly).some(a=>a.start<=schedule.time&&a.end>=end))return 'No working hours covering this job';
  if(periods.some(a=>a.type==='Unavailable'&&a.start<end&&a.end>schedule.time))return 'Time off overlaps this job';
  if((state.assignments||[]).some(a=>String(a.staffId)===String(person.id)&&String(a.scheduleId)!==String(schedule.id)&&a.date===schedule.date&&a.status==='Assigned'&&a.start<end&&a.end>schedule.time&&state.schedules.some(s=>String(s.id)===String(a.scheduleId)&&!['Cancelled','Completed'].includes(s.status))))return 'Assigned to an overlapping job';
  return '';
}
function openAssignment(scheduleId,assignmentId=0){
  if(assignmentId)return openPersonnelStatus(assignmentId);
  const s=state.schedules.find(s=>String(s.id)===String(scheduleId));if(!s)return;
  const end=s.end||String(Math.min(23,Number(s.time.slice(0,2))+1)).padStart(2,'0')+s.time.slice(2);
  const selected=(state.assignments||[]).filter(a=>String(a.scheduleId)===String(s.id)&&a.status!=='Cancelled').map(a=>String(a.staffId));
  openModal(`<h2>Assign personnel</h2><p>${escapeHtml(s.service)} · ${dateFmt(s.date)}</p><form id="teamForm" onsubmit="saveAssignmentForm(event,${jsArg(scheduleId)})"><div class="form-grid"><div class="field"><label for="teamStart">Start (booking time)</label><input id="teamStart" name="start" type="time" value="${escapeHtml(s.time)}" readonly required></div><div class="field"><label for="teamEnd">End</label><input id="teamEnd" name="end" type="time" value="${escapeHtml(end)}" ${s.end?'readonly':''} onchange="updateTeamChoices(${jsArg(scheduleId)})" required></div></div><fieldset class="team-picker"><legend>Personnel · <span id="teamCount" aria-live="polite">0/3 Assigned</span></legend>${(state.personnel||[]).filter(p=>p.status==='active').map(p=>`<label class="team-choice"><input type="checkbox" name="personnelIds" value="${p.id}" ${selected.includes(String(p.id))?'checked':''} onchange="updateTeamChoices(${jsArg(scheduleId)})"><span><strong>${escapeHtml(p.name)}${p.role==='admin'?' · Owner':''}</strong><small data-personnel-reason="${p.id}"></small></span></label>`).join('')}</fieldset><p class="card-sub">Select 1–3 people. Record working availability before assignment. To change booking times, use Manage booking.</p><p id="teamError" role="alert"></p><div class="modal-actions"><button type="button" class="secondary" onclick="closeModal()">Cancel</button><button class="primary">Save team</button></div></form>`);
  updateTeamChoices(scheduleId);
}
function openPersonnelStatus(id){
  const a=(state.assignments||[]).find(a=>String(a.id)===String(id)),s=a&&state.schedules.find(s=>String(s.id)===String(a.scheduleId));if(!s)return;
  const writable=!['Completed','Cancelled'].includes(s.status)&&(state.personnel||[]).some(p=>String(p.id)===String(a.staffId)&&p.status==='active');
  openModal(`<h2>Personnel assignment</h2><p>${escapeHtml(a.staff)} · ${escapeHtml(s.service)}</p><p>${dateFmt(s.date)} · ${escapeHtml(a.start)}–${escapeHtml(a.end)}</p>${writable?`<form onsubmit="savePersonnelStatus(event,${jsArg(id)})"><div class="field"><label for="personnelStatus">Assignment status</label><select id="personnelStatus" name="status">${['Assigned','Completed','Cancelled'].map(status=>`<option ${a.status===status?'selected':''}>${status}</option>`).join('')}</select></div><div class="modal-actions"><button type="button" class="secondary" onclick="openAssignment(${jsArg(s.id)})">Manage whole team</button><button class="primary">Save status</button></div></form>`:'<p class="card-sub">Historical assignment. The booking is closed or the account is inactive.</p>'}<div class="modal-actions"><button class="secondary" onclick="openJob(${jsArg(s.id)})">Back to job</button></div>`);
}
async function savePersonnelStatus(event,id){
  event.preventDefault();const a=(state.assignments||[]).find(a=>String(a.id)===String(id));if(!a)return;
  if(await commitChange('assignStaff',{id:a.id,scheduleId:a.scheduleId,staffId:a.staffId,start:a.start,end:a.end,status:event.currentTarget.elements.status.value},event)){openJob(a.scheduleId);render();toast('Personnel status saved');}
}
function updateTeamChoices(scheduleId){
  const s=state.schedules.find(s=>String(s.id)===String(scheduleId)),form=document.getElementById('teamForm');if(!s||!form)return;
  const boxes=[...form.querySelectorAll('[name=personnelIds]')],count=boxes.filter(b=>b.checked).length;
  document.getElementById('teamCount').textContent=count+'/3 Assigned';
  for(const box of boxes){const person=state.personnel.find(p=>String(p.id)===box.value),reason=personnelAvailability(person,s,form.elements.end.value),limit=count>=3&&!box.checked;
    box.disabled=Boolean(reason)||limit;box.closest('label').classList.toggle('is-unavailable',Boolean(reason)||limit);form.querySelector('[data-personnel-reason="'+box.value+'"]').textContent=reason||(limit?'Maximum of three selected':'Available');}
}
async function saveAssignmentForm(event,scheduleId){
  event.preventDefault();const form=event.currentTarget,s=state.schedules.find(s=>String(s.id)===String(scheduleId)),ids=[...form.querySelectorAll('[name=personnelIds]:checked')].map(b=>Number(b.value));
  if(ids.length<1||ids.length>3||ids.some(id=>personnelAvailability(state.personnel.find(p=>Number(p.id)===id),s,form.elements.end.value))){document.getElementById('teamError').textContent='Choose one to three available personnel.';return;}
  if(await commitChange('assignTeam',{scheduleId,personnelIds:ids,start:form.elements.start.value,end:form.elements.end.value},event)){closeModal();render();toast('Team assignment saved');}
}
