'use strict';
let publicReviewMode='authentic',publicReviewPage=1,publicReviewRequest=0;
async function loadPublicReviews(page=1,mode=publicReviewMode){
  const version=++publicReviewRequest,body=document.getElementById('publicReviewsBody');publicReviewMode=mode;publicReviewPage=page;
  body.setAttribute('aria-busy','true');body.innerHTML='<p role="status">Loading reviews…</p>';
  document.querySelectorAll('[data-review-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.reviewMode===mode)));
  try{
    const response=await fetch(`api/public-reviews.php?mode=${encodeURIComponent(mode)}&page=${page}`,{cache:'no-store',signal:AbortSignal.timeout(12000)}),data=await response.json();
    if(!response.ok||!data.success)throw Error('Reviews are temporarily unavailable.');if(version!==publicReviewRequest)return;
    const disclaimer=mode==='demo'?'<p class="review-disclaimer"><strong>Fictional academic examples.</strong> These reviews demonstrate the system and are not real customer endorsements. Their ratings are excluded from customer review statistics.</p>':'';
    const stats=data.total?`<div class="public-review-summary"><div><strong>${Number(data.average).toFixed(1)} / 5</strong><span>${Number(data.total)} ${mode==='demo'?'fictional examples':'published reviews'}</span></div><div class="rating-distribution">${[5,4,3,2,1].map(rating=>`<div><span>${rating} ★</span><meter min="0" max="${Number(data.total)}" value="${Number(data.distribution[rating]||0)}" aria-label="${rating} star reviews"></meter><span>${Number(data.distribution[rating]||0)}</span></div>`).join('')}</div></div>`:'';
    body.innerHTML=disclaimer+stats+`<div class="public-review-grid">${data.reviews.map(review=>`<article class="public-review-card"><div class="public-review-stars" aria-label="${Number(review.rating)} out of 5 stars">${'★'.repeat(Number(review.rating))}${'☆'.repeat(5-Number(review.rating))}</div><p>${publicEscape(review.text)}</p><footer><strong>${publicEscape(review.name)}</strong><time>${new Intl.DateTimeFormat('en-PH',{timeZone:'Asia/Manila',year:'numeric',month:'short',day:'numeric'}).format(new Date(review.createdAt.replace(' ','T')+'+08:00'))}</time>${Number(review.demoSeed)?'<span>Fictional demo example</span>':''}</footer></article>`).join('')||'<div class="portfolio-empty"><h3>No published customer reviews yet.</h3><p>Clients can submit feedback from their portal. Reviews appear here after moderation.</p></div>'}</div>`+`<div class="review-pagination"><button class="button outline" ${page<=1?'disabled':''} onclick="loadPublicReviews(${page-1})">Previous</button><span>Page ${page} of ${Math.max(1,Math.ceil(data.total/6))}</span><button class="button outline" ${page*6>=data.total?'disabled':''} onclick="loadPublicReviews(${page+1})">Next</button></div>`;
  }catch(error){if(version===publicReviewRequest)body.innerHTML='<p role="alert">Reviews could not be loaded. Please try again.</p><button class="button outline" onclick="loadPublicReviews()">Retry</button>';}
  finally{if(version===publicReviewRequest)body.setAttribute('aria-busy','false');}
}
document.querySelectorAll('[data-review-mode]').forEach(button=>button.addEventListener('click',()=>loadPublicReviews(1,button.dataset.reviewMode)));
loadPublicReviews();
