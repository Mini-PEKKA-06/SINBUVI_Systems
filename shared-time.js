function timeLabel(value){
  const match=/^(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(value||''));
  if(!match||+match[1]>23||+match[2]>59)return '—';
  const hour=+match[1];return `${hour%12||12}:${match[2]} ${hour<12?'AM':'PM'}`;
}
function manilaDateTime(value){
  if(!value)return '—';
  const text=String(value).trim().replace(' ','T');
  const instant=new Date(/[zZ]$|[+-]\d{2}:?\d{2}$/.test(text)?text:text+'+08:00');
  return Number.isNaN(instant.getTime())?'—':new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Manila',year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true}).format(instant);
}
// Canonical values/IDs remain HH:mm; visible controls explicitly use AM/PM.
function use12HourInputs(){
  document.querySelectorAll('input[type="time"]').forEach(input=>{
    const label=input.closest('.field')?.querySelector('label')?.textContent||input.name||'Time';
    const [hour='09',minute='00']=(input.value||'09:00').split(':');
    input.type='hidden';input.value=hour+':'+minute;
    const box=document.createElement('div');box.className='time-editor';
    const options=(values,selected)=>values.map(v=>`<option value="${v}" ${String(v)===String(selected)?'selected':''}>${String(v).padStart(2,'0')}</option>`).join('');
    box.innerHTML=`<select aria-label="${escapeHtml(label)} hour">${options(Array.from({length:12},(_,i)=>i+1),Number(hour)%12||12)}</select><span>:</span><select aria-label="${escapeHtml(label)} minute">${options(Array.from({length:60},(_,i)=>String(i).padStart(2,'0')),minute)}</select><select aria-label="${escapeHtml(label)} AM or PM"><option ${+hour<12?'selected':''}>AM</option><option ${+hour>=12?'selected':''}>PM</option></select>`;
    const controls=[...box.querySelectorAll('select')];
    for(const control of controls){control.disabled=input.disabled||input.readOnly;control.addEventListener('change',()=>{input.value=String((Number(controls[0].value)%12)+(controls[2].value==='PM'?12:0)).padStart(2,'0')+':'+controls[1].value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});}
    input.after(box);
  });
}
new MutationObserver(use12HourInputs).observe(document.body,{childList:true,subtree:true});
