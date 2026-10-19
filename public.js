'use strict';
// Public presentation has no dependency on the management session or snapshot.
if(new URLSearchParams(location.search).get('demo')==='1')location.replace('portal.html?demo=1');
document.documentElement.classList.add('js');
const publicEscape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeSocial=value=>{try{const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}};
function configureSocial(){
 const facebook=safeSocial(typeof SINGIN_FACEBOOK_URL==='string'?SINGIN_FACEBOOK_URL:'');
 for(const id of ['facebookContact','footerFacebook'])if(facebook){const link=document.getElementById(id);link.href=facebook;link.classList.remove('hidden');}
 const messenger=safeSocial(typeof SINGIN_MESSENGER_URL==='string'?SINGIN_MESSENGER_URL:'');
 if(messenger){const button=document.getElementById('messengerContact'),link=document.createElement('a');link.className=button.className;link.id=button.id;link.textContent='Message us ↗';link.href=messenger;link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','Message Singin Glass and Aluminum Supply');button.replaceWith(link);const floating=document.getElementById('floatingContact');floating.href=messenger;floating.target='_blank';floating.rel='noopener noreferrer';floating.textContent='Message Singin ↗';}
}
configureSocial();
// Keep fixed contact controls off the hero and form so they cannot cover actions.
let publicHeroVisible=true,publicContactVisible=false;
function updateFloatingContact(){document.getElementById('floatingContact').classList.toggle('is-hidden',publicHeroVisible||publicContactVisible);document.querySelector('.back-top').classList.toggle('is-hidden',publicHeroVisible);}
if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.target.id==='home')publicHeroVisible=entry.isIntersecting;else publicContactVisible=entry.isIntersecting;}updateFloatingContact();});observer.observe(document.getElementById('home'));observer.observe(document.getElementById('contact'));}
else{document.getElementById('floatingContact').classList.remove('is-hidden');document.querySelector('.back-top').classList.remove('is-hidden');}
const menuToggle=document.getElementById('menuToggle'),siteNav=document.getElementById('siteNav');
function closePublicMenu(){siteNav.classList.remove('open');menuToggle.setAttribute('aria-expanded','false');menuToggle.setAttribute('aria-label','Open navigation');}
menuToggle.addEventListener('click',()=>{const open=siteNav.classList.toggle('open');menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');});
siteNav.addEventListener('click',event=>{if(event.target.closest('a'))closePublicMenu();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&siteNav.classList.contains('open')){closePublicMenu();menuToggle.focus();}});
document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closePublicMenu();});

function businessHoursStatus(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Manila',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 const minutes=Number(parts.hour)*60+Number(parts.minute),closing=parts.weekday==='Sat'?660:1080,open=parts.weekday!=='Sun'&&minutes>=450&&minutes<closing;
 return {open,text:open?'Open now · '+(parts.weekday==='Sat'?'Until 11:00 AM':'Until 6:00 PM'):'Closed now · See regular hours below'};
}
function showBusinessHours(){const status=businessHoursStatus(),element=document.getElementById('businessStatus');element.textContent=status.text;element.classList.toggle('open',status.open);}
showBusinessHours();setInterval(showBusinessHours,60000);document.getElementById('copyrightYear').textContent=String(new Date().getFullYear());

const motion=matchMedia('(prefers-reduced-motion: reduce)');
const CAROUSEL_INTERVAL_MS=3000;
let carouselSlides=[],carouselIndex=0,carouselTimer=null;
const carousel=document.getElementById('heroCarousel');
function illustrationSlide(kind,caption){return `<div class="hero-slide" aria-hidden="true"><div class="architectural-art ${kind}" role="img" aria-label="Architectural material illustration; not a completed company project"><div class="art-wall"></div><div class="art-window">${'<span></span>'.repeat(kind==='partition'?4:6)}</div></div><div class="slide-caption"><small>Material study · Illustration</small>${caption}</div></div>`;}
function setupCarousel(projects=[]){
 const featured=projects.slice(0,4);let html;
 if(featured.length){html=featured.map((project,i)=>{const picture=project.images[0];return `<div class="hero-slide" aria-hidden="true"><img src="${publicEscape(picture.url)}" width="${Number(picture.width)}" height="${Number(picture.height)}" alt="${publicEscape(picture.alt)}" loading="${i===0?'eager':'lazy'}" decoding="async" fetchpriority="${i===0?'high':'auto'}"><div class="slide-caption"><small>Published project · ${publicEscape(project.category)}</small>${publicEscape(project.title)}</div></div>`;}).join('');document.getElementById('heroNote').textContent='Selected project photographs published by Singin.';}
 else html=illustrationSlide('','Light, structure & possibility.')+illustrationSlide('frames','Profiles for practical possibilities.')+illustrationSlide('partition','A new perspective for your space.');
 document.getElementById('carouselStage').innerHTML=html;carouselSlides=[...document.querySelectorAll('.hero-slide')];carouselIndex=0;
 document.getElementById('carouselDots').innerHTML=carouselSlides.map((_,i)=>`<button class="carousel-dot" type="button" aria-label="Show slide ${i+1}" aria-current="false" data-slide="${i}"></button>`).join('');
 document.getElementById('slidePrevious').disabled=carouselSlides.length<2;document.getElementById('slideNext').disabled=carouselSlides.length<2;showSlide(0);restartCarousel();
}
function showSlide(index){if(!carouselSlides.length)return;carouselIndex=(index+carouselSlides.length)%carouselSlides.length;carouselSlides.forEach((slide,i)=>{slide.classList.toggle('active',i===carouselIndex);slide.setAttribute('aria-hidden',String(i!==carouselIndex));});document.querySelectorAll('.carousel-dot').forEach((button,i)=>button.setAttribute('aria-current',String(i===carouselIndex)));}
function restartCarousel(){
 clearInterval(carouselTimer);carouselTimer=null;
 if(!document.hidden&&!motion.matches&&carouselSlides.length>1){
  carouselTimer=setInterval(()=>showSlide(carouselIndex+1),CAROUSEL_INTERVAL_MS);
 }
}
document.getElementById('slidePrevious').addEventListener('click',()=>{showSlide(carouselIndex-1);restartCarousel();});
document.getElementById('slideNext').addEventListener('click',()=>{showSlide(carouselIndex+1);restartCarousel();});
document.getElementById('carouselDots').addEventListener('click',event=>{const button=event.target.closest('[data-slide]');if(button){showSlide(Number(button.dataset.slide));restartCarousel();}});
carousel.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();showSlide(carouselIndex+(event.key==='ArrowRight'?1:-1));restartCarousel();}});
document.addEventListener('visibilitychange',restartCarousel);motion.addEventListener('change',restartCarousel);
let touchStart=null;carousel.addEventListener('touchstart',event=>{touchStart=event.touches[0]?.clientX??null;},{passive:true});carousel.addEventListener('touchend',event=>{const end=event.changedTouches[0]?.clientX;if(touchStart!==null&&end!==undefined&&Math.abs(end-touchStart)>45){showSlide(carouselIndex+(end<touchStart?1:-1));restartCarousel();}touchStart=null;},{passive:true});
setupCarousel();

// Reveal once; native links remain usable without JavaScript or animation.
const specialtyCards=[...document.querySelectorAll('.specialty-card')];
let specialtyObserver=null;
if('IntersectionObserver' in window&&!motion.matches){
 document.documentElement.classList.add('specialty-motion');
 specialtyObserver=new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-revealed');specialtyObserver.unobserve(entry.target);}
 },{threshold:0.15});
 specialtyCards.forEach(card=>specialtyObserver.observe(card));
}
motion.addEventListener('change',()=>{
 if(motion.matches){document.documentElement.classList.remove('specialty-motion');specialtyObserver?.disconnect();}
});

function showAboutProject(projects){
 const project=projects.find(p=>p.slug.startsWith('lola-paulina'))||projects[0];
 if(!project?.images.length)return;
 const photo=project.images[0],panel=document.querySelector('.about-panel');
 const image=document.createElement('img');image.src=photo.url;image.alt='';
 image.width=Number(photo.width);image.height=Number(photo.height);image.loading='lazy';image.decoding='async';
 panel.prepend(image);panel.classList.add('has-project-photo');panel.setAttribute('aria-label','Company project photograph: '+photo.alt);
}

let publicProjects=[],projectFilter='All',lightboxProject=null,lightboxIndex=0,lightboxTrigger=null;
function renderProjects(){
 const summary=document.getElementById('projectSummary');if(summary)summary.textContent=publicProjects.length?`${publicProjects.length} company projects · ${publicProjects.reduce((n,p)=>n+p.images.length,0)} photographs`:'Published work from Singin Glass & Aluminum Supply';
 const projects=publicProjects.filter(p=>projectFilter==='All'||p.category===projectFilter);const grid=document.getElementById('projectGrid');
 grid.innerHTML=projects.map(p=>{const image=p.images[0];return `<article class="project-card"><a href="?project=${encodeURIComponent(p.slug)}#work" data-project="${Number(p.id)}"><div class="project-image"><img src="${publicEscape(image.url)}" width="${Number(image.width)}" height="${Number(image.height)}" alt="${publicEscape(image.alt)}" loading="lazy" decoding="async"><span class="project-photo-count">${p.images.length} photographs</span></div><span class="eyebrow">${publicEscape(p.category)}</span><h3>${publicEscape(p.title)} ↗</h3><p>${publicEscape(p.description.length>130?p.description.slice(0,127)+'…':p.description)}</p></a></article>`;}).join('')||`<div class="portfolio-empty"><div class="empty-symbol" aria-hidden="true">▧</div><h3>${publicProjects.length?'No projects in this category yet.':'Project gallery coming soon.'}</h3><p>Speak with our team about your space and project requirements while our gallery is being prepared.</p><a class="button outline" href="#contact">Discuss your project ↗</a></div>`;
 document.querySelectorAll('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===projectFilter)));
}
document.getElementById('workFilters').addEventListener('click',event=>{const button=event.target.closest('[data-filter]');if(button){projectFilter=button.dataset.filter;renderProjects();}});
document.getElementById('projectGrid').addEventListener('click',event=>{const link=event.target.closest('[data-project]');if(link){event.preventDefault();openProject(Number(link.dataset.project),link);}});
const lightbox=document.getElementById('projectLightbox');
function openProject(id,trigger){const project=publicProjects.find(p=>Number(p.id)===id);if(!project)return;lightboxProject=project;lightboxIndex=0;lightboxTrigger=trigger||document.activeElement;document.getElementById('lightboxTitle').textContent=project.title;document.getElementById('lightboxDescription').textContent=project.description;document.getElementById('lightboxMeta').textContent=[project.category,project.location,project.year].filter(Boolean).join(' · ');document.getElementById('lightboxThumbs').innerHTML=project.images.map((image,i)=>`<button type="button" data-image="${i}" aria-label="View project image ${i+1}" aria-current="false"><img src="${publicEscape(image.url)}" width="64" height="48" alt="${publicEscape(image.alt)}" loading="lazy"></button>`).join('');showProjectImage(0);lightbox.showModal();document.body.style.overflow='hidden';const url=new URL(location.href);url.searchParams.set('project',project.slug);url.hash='work';history.replaceState(null,'',url);}
function showProjectImage(index){if(!lightboxProject)return;const pictures=lightboxProject.images;lightboxIndex=(index+pictures.length)%pictures.length;const picture=pictures[lightboxIndex],image=document.getElementById('lightboxImage');image.src=picture.url;image.alt=picture.alt;image.width=Number(picture.width);image.height=Number(picture.height);document.getElementById('lightboxCount').textContent=`${lightboxIndex+1} / ${pictures.length}`;document.querySelectorAll('[data-image]').forEach(button=>button.setAttribute('aria-current',String(Number(button.dataset.image)===lightboxIndex)));for(const id of ['lightboxPrevious','lightboxNext'])document.getElementById(id).disabled=pictures.length<2;}
function closeProject(){lightbox.close();}
lightbox.addEventListener('close',()=>{document.body.style.overflow='';const url=new URL(location.href);url.searchParams.delete('project');history.replaceState(null,'',url);lightboxTrigger?.focus();});
document.getElementById('lightboxClose').addEventListener('click',closeProject);lightbox.addEventListener('click',event=>{if(event.target===lightbox)closeProject();});
lightbox.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();showProjectImage(lightboxIndex+(event.key==='ArrowRight'?1:-1));}});
document.getElementById('lightboxPrevious').addEventListener('click',()=>showProjectImage(lightboxIndex-1));document.getElementById('lightboxNext').addEventListener('click',()=>showProjectImage(lightboxIndex+1));document.getElementById('lightboxThumbs').addEventListener('click',event=>{const button=event.target.closest('[data-image]');if(button)showProjectImage(Number(button.dataset.image));});
document.getElementById('lightboxInquiry').addEventListener('click',()=>{document.getElementById('inquiryService').value=lightboxProject.title;document.getElementById('inquiryType').value='Project discussion';closeProject();});

async function loadPublicContent(){try{const response=await fetch('api/public-data.php',{cache:'no-store',signal:AbortSignal.timeout(12000)}),data=await response.json();if(!response.ok||!data.success)throw Error('Public content unavailable.');publicProjects=data.projects;renderProjects();const categories=[...new Set(publicProjects.map(p=>p.category))];document.getElementById('workFilters').innerHTML=['All',...categories].map(category=>`<button class="filter-button" type="button" data-filter="${publicEscape(category)}" aria-pressed="${category==='All'}">${category==='All'?'All work':publicEscape(category)}</button>`).join('');setupCarousel(publicProjects);showAboutProject(publicProjects);
 const groups=Object.groupBy?Object.groupBy(data.catalog,p=>p.category):data.catalog.reduce((acc,p)=>((acc[p.category]??=[]).push(p),acc),{});document.getElementById('publicCatalog').innerHTML=Object.entries(groups).map(([category,products])=>`<div class="catalog-group"><h3>${publicEscape(category)}</h3><ul>${products.map(p=>`<li>${publicEscape(p.name)}</li>`).join('')}</ul></div>`).join('')||'<p>Ask our team about the materials you need.</p>';
 const slug=new URLSearchParams(location.search).get('project'),project=publicProjects.find(p=>p.slug===slug);if(project)openProject(Number(project.id));
 }catch{document.getElementById('projectGrid').innerHTML='<div class="portfolio-empty"><h3>Our gallery is temporarily unavailable.</h3><p>Contact us directly to discuss your project. Phone, email and directions remain available below.</p><a class="button outline" href="#contact">Contact the team ↗</a></div>';}}
loadPublicContent();

document.querySelectorAll('[data-service]').forEach(link=>link.addEventListener('click',()=>{document.getElementById('inquiryService').value=link.dataset.service;document.getElementById('inquiryType').value='Quotation request';}));
document.querySelectorAll('[data-quote]').forEach(link=>link.addEventListener('click',()=>{document.getElementById('inquiryType').value='Quotation request';}));
const inquiryForm=document.getElementById('inquiryForm');let inquiryBusy=false,inquiryToken=null,inquirySignature='';
document.getElementById('inquirySubmit').disabled=false;
function inquiryKey(payload){const signature=JSON.stringify(payload);if(signature!==inquirySignature){inquirySignature=signature;inquiryToken=crypto.randomUUID();}return inquiryToken;}
inquiryForm.addEventListener('submit',async event=>{event.preventDefault();if(inquiryBusy||!inquiryForm.reportValidity())return;const payload=Object.fromEntries(new FormData(inquiryForm));for(const key of Object.keys(payload))payload[key]=payload[key].trim();const feedback=document.getElementById('inquiryFeedback'),button=document.getElementById('inquirySubmit');feedback.className='form-feedback';if(!payload.fullName||!payload.message){feedback.textContent='Enter your name and a message before sending.';feedback.classList.add('error');return;}if(payload.phone&&(!/^[+0-9() .-]{5,30}$/.test(payload.phone)||payload.phone.replace(/\D/g,'').length<7||payload.phone.replace(/\D/g,'').length>15)){feedback.textContent='Enter a valid contact number or leave it blank.';feedback.classList.add('error');return;}inquiryBusy=true;button.disabled=true;button.textContent='Sending…';feedback.textContent='Sending your inquiry…';
 try{const response=await fetch('api/public-inquiry.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,submissionKey:inquiryKey(payload)}),signal:AbortSignal.timeout(15000)});let data;try{data=await response.json();}catch{throw Error('The inquiry service is unavailable. Please call or email us, or retry this form.');}if(!response.ok||!data.success)throw Error(data.message||'Unable to send your inquiry.');feedback.textContent=`${data.message} Reference: ${data.reference}.`;feedback.classList.add('success');inquiryForm.reset();inquiryToken=null;inquirySignature='';}
 catch(error){feedback.textContent=error.name==='TimeoutError'?'The response timed out. Retry this unchanged form to check without creating a duplicate.':error.message==='Failed to fetch'?'Unable to connect. Your details are kept; retry or contact us directly.':error.message;feedback.classList.add('error');}
 finally{inquiryBusy=false;button.disabled=false;button.textContent='Send Inquiry ↗';}
});
