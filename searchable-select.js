// Retain the native select as the canonical submitted material ID.
let comboSequence=0;
function enhanceMaterialSelect(select){
 if(select.dataset.searchable)return;select.dataset.searchable='1';
 const material=select.matches('.material-product'),catalog=material?state.inventory:state.clients,label=material?'material':'client';
 const box=document.createElement('div');box.className='material-combobox';
 const input=document.createElement('input'),list=document.createElement('div'),listId='material-options-'+(++comboSequence);
 input.type='search';input.placeholder=material?'Search name, SKU or category':'Search client name or email';input.setAttribute('role','combobox');input.setAttribute('aria-label','Search '+label);input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',listId);input.setAttribute('aria-expanded','false');input.autocomplete='off';
 list.id=listId;list.className='material-options';list.role='listbox';list.hidden=true;select.before(box);box.append(input,list);select.classList.add('canonical-material');select.tabIndex=-1;
 let results=[],active=-1;
 const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');};
 const draw=()=>{const query=input.value.trim().toLowerCase();results=[...select.options].filter(o=>o.value).filter(o=>{const p=catalog.find(p=>String(p.id)===o.value);return [p?.name,p?.sku,p?.category,p?.email].join(' ').toLowerCase().includes(query);});active=-1;list.innerHTML='';for(const [i,o] of results.entries()){const el=document.createElement('div');el.id=listId+'-'+i;el.role='option';el.textContent=o.textContent;el.addEventListener('mousedown',e=>e.preventDefault());el.addEventListener('click',()=>choose(i));list.append(el);}if(!results.length){const empty=document.createElement('div');empty.textContent=material?'No matching materials':'No matching clients';list.append(empty);}list.hidden=false;input.setAttribute('aria-expanded','true');};
 const choose=i=>{const o=results[i];if(!o)return;select.value=o.value;input.value=catalog.find(p=>String(p.id)===o.value)?.name||o.textContent;input.setCustomValidity('');select.dispatchEvent(new Event('change',{bubbles:true}));close();};
 input.addEventListener('focus',()=>{input.select();draw();});
 input.addEventListener('input',()=>{select.value='';input.setCustomValidity(input.value?'Choose a matching '+label+'.':'Choose a '+label+'.');select.dispatchEvent(new Event('change',{bubbles:true}));draw();});
 input.addEventListener('keydown',e=>{if(e.key==='Escape'){close();e.preventDefault();}else if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(list.hidden)draw();if(results.length){active=(active+(e.key==='ArrowDown'?1:-1)+results.length)%results.length;[...list.children].forEach((el,i)=>el.setAttribute('aria-selected',i===active));input.setAttribute('aria-activedescendant',list.children[active].id);list.children[active].scrollIntoView({block:'nearest'});}}else if(e.key==='Enter'&&!list.hidden){e.preventDefault();choose(active<0?0:active);}});
 input.addEventListener('blur',()=>setTimeout(close,150));
 input.required=true;input.setCustomValidity(select.value?'':'Choose a '+label+'.');
 select.addEventListener('change',()=>{if(select.value){input.value=catalog.find(p=>String(p.id)===select.value)?.name||'';input.setCustomValidity('');}else if(!input.value)input.setCustomValidity('Choose a '+label+'.');});
}
const searchableAddMaterial=addMaterialRow;
addMaterialRow=function(){searchableAddMaterial();document.querySelectorAll('.material-product').forEach(enhanceMaterialSelect);};

new MutationObserver(()=>document.querySelectorAll('#tClient,#sClient').forEach(s=>{if(s.options.length>10)enhanceMaterialSelect(s);})).observe(document.body,{childList:true,subtree:true});
