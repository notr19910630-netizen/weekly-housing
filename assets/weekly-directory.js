/* Progressive directory navigation; retained weeks before the rollout keep their original interface. */
(()=>{
'use strict';
const since=DATA.release_manifest?.directory_since||'2026/10/27';
const states=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=(n,w)=>Number(n).toLocaleString('zh-TW',{maximumFractionDigits:w.inventory_status?4:2});
const regionOrder=['新竹市','竹北市','新竹縣其他地區','竹南鎮','頭份市'];
const routeParams=new URLSearchParams(location.hash.slice(1));
let routeIsActive=false;
function countLabel(w){return w.run_id===DATA.latest_week_id?'本週':'該週';}
function makeButton(text,cls){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=text;return b;}
function updateOverview(panel){
 const state=states.get(panel);if(!state)return;
 const {week,entries,overview}=state;let transactions=0,visibleEntries=0;
 entries.forEach(entry=>{
  const matched=entry.transactions.filter(t=>!state.rows.get(t.transaction_id).hidden);
  entry.button.hidden=!matched.length;
  entry.button.dataset.transactionCount=String(matched.length);
  if(!matched.length)return;
  transactions+=matched.length;visibleEntries++;
  const prices=matched.map(t=>t.price_wan),lo=Math.min(...prices),hi=Math.max(...prices);
  entry.button.querySelector('.directory-entry-price strong').textContent=money(lo,week)+(lo===hi?'':'–'+money(hi,week));
  entry.button.querySelector('.directory-entry-meta').textContent=[...new Set(matched.map(t=>t.property_category||t.product_type||'類型待確認'))].join('／')+' · '+(matched.length>1?'成交 '+matched.length+' 筆':matched[0].date.slice(5)+' 成交');
 });
 overview.querySelectorAll('.directory-region').forEach(section=>{const entries=[...section.querySelectorAll('.directory-entry')].filter(e=>!e.hidden);section.hidden=!entries.length;section.querySelector('.directory-region-heading>span').textContent=entries.reduce((n,e)=>n+Number(e.dataset.transactionCount),0)+' 筆成交';});
 overview.querySelector('.directory-catalog-count').textContent=transactions+' 筆成交 · '+visibleEntries+' 個社區／案件';
 overview.querySelector('.directory-region-select').value=panel.dataset.region||'all';
 const empty=overview.querySelector('.directory-empty');empty.hidden=transactions!==0;
 if(state.active)overview.hidden=true;
 if(week.inventory_status==='verification_pending')empty.textContent=panel.querySelector('.search-only').checked?'在售查核尚未完成，目前沒有可列入此篩選的物件':'查無符合條件的成交';
}
function writeRoute(panel,key,push=false){
 const p=new URLSearchParams();p.set('week',panel.dataset.week);if(key)p.set('case',key);
 history[push?'pushState':'replaceState'](null,'',location.pathname+location.search+(key?'#'+p.toString():''));
 routeIsActive=Boolean(key);
}
function closeDetail(panel,{restore=true,route=true}={}){
 const state=states.get(panel);if(!state?.active)return;
 const active=state.active;
 state.store.appendChild(active.node);state.active=null;state.detail.hidden=true;state.overview.hidden=false;
 applyFilters(panel);
 if(route&&routeIsActive)writeRoute(panel,null);
 if(restore)requestAnimationFrame(()=>{window.scrollTo({top:state.scroll,behavior:'instant'});active.button.focus({preventScroll:true});});
}
function openDetail(panel,key,{route=true,scroll=true}={}){
 const state=states.get(panel),entry=state?.entries.find(e=>e.key===key);if(!entry)return;
 if(state.active)closeDetail(panel,{restore:false,route:false});
 state.scroll=window.scrollY;state.active=entry;state.overview.hidden=true;state.detail.hidden=false;
 state.detail.querySelector('.directory-detail-title').textContent=entry.name;
 state.detail.querySelector('.directory-detail-location').textContent=entry.transactions[0].region+' · '+[...new Set(entry.transactions.map(t=>t.property_category||t.product_type||'類型待確認'))].join('／');
 const node=entry.node;node.hidden=false;
 node.querySelectorAll('.filterable').forEach(e=>e.hidden=false);
 if(node.matches('.filterable'))node.hidden=false;
 if(node.matches('details'))node.open=true;
 state.detail.querySelector('.directory-detail-body').appendChild(node);
 state.detail.querySelectorAll('.inventory-block').forEach(sortInventory);
 if(route)writeRoute(panel,key,true);
 const range=state.detail.querySelector('.directory-detail-range'),matched=entry.button?.dataset.transactionCount;
 if(state.week.inventory_status&&range){range.hidden=!matched||Number(matched)===entry.transactions.length;
 if(!range.hidden)range.textContent='本櫃顯示該社區本週全部 '+entry.transactions.length+' 筆成交，總目錄有 '+matched+' 筆符合目前篩選。';}
 if(scroll)state.detail.scrollIntoView({block:'start',behavior:'instant'});
 state.detail.querySelector('.directory-back').focus({preventScroll:true});
}
function mount(panel,week){
 if(!week.community_inventories||week.period_start<since)return;
 const rows=new Map([...panel.querySelectorAll('.filterable')].map(e=>[e.dataset.transactionId,e]));
 if(week.transactions.some(t=>!rows.has(t.transaction_id)))return;
 panel.classList.add('directory-week');
 const store=document.createElement('div');store.className='directory-detail-store';store.hidden=true;
 const modules=new Map([...panel.querySelectorAll('.community-module')].map(e=>[e.dataset.communityKey,e]));
 const groups=new Map(),inventories=new Map(week.community_inventories.map(c=>[c.community_key,c]));
 week.transactions.forEach(t=>{const community=t.community_key&&modules.has(t.community_key),key=community?t.community_key:t.transaction_id;if(!groups.has(key))groups.set(key,{key,name:community?(t.community_name||t.title):t.title,transactions:[],inventory:community?inventories.get(t.community_key):null,node:community?modules.get(t.community_key):rows.get(t.transaction_id)});groups.get(key).transactions.push(t);});
 const entries=[...groups.values()];entries.forEach(e=>store.appendChild(e.node));
 const controls=panel.querySelector('.search-controls'),oldFilters=panel.querySelector('.filters');
 const classifications=panel.querySelector('.summary');
 const overview=document.createElement('section');overview.className='directory-overview';
 const n=week.counts.CONFIRMED_TRANSACTION;
 overview.innerHTML=`<div class="directory-heading"><span class="directory-kicker">近期成交行情</span><h2>${countLabel(week)}成交總目錄</h2><div class="directory-total"><strong>${n}</strong><span>筆成交</span><small>點選案件，進入商品櫃 →</small></div><p class="directory-inventory-total">${week.inventory_status==='verification_pending'?'在售資料尚未完成確認':week.inventory_status==='partial'?'已核實不同在售 '+week.counts.verified_inventory_units+' 戶 · 部分來源尚未確認':'已盤點社區 '+week.community_inventories.length+' 個 · 已核實不同在售 '+week.counts.verified_inventory_units+' 戶'}</p></div>`;
 if(week.run_id!==DATA.latest_week_id){const notice=document.createElement('p');notice.className='history-note';notice.textContent='歷史資料｜物件資訊與連結以當週資料確認時間為準，可能已變價、成交或下架。';overview.prepend(notice);}
 const classification=document.createElement('details');classification.className='directory-classifications';classification.innerHTML='<summary>查看完整成交產品分類</summary>';classification.appendChild(classifications);overview.appendChild(classification);
 const priceFields=[...controls.querySelectorAll('label')].filter(l=>l.querySelector('.search-min,.search-max'));
 const prices=document.createElement('details');prices.className='directory-price-fields';prices.innerHTML='<summary>成交價區間</summary><div class="directory-price-inputs"></div>';priceFields.forEach(l=>prices.querySelector('div').appendChild(l));
 const regionLabel=document.createElement('label');regionLabel.className='directory-region-label';regionLabel.append('區域');
 const regionSelect=document.createElement('select');regionSelect.className='directory-region-select';regionSelect.setAttribute('aria-label','成交區域');
 const regions=[...new Set(week.transactions.map(t=>t.region))],regionIndex=new Map(regions.map((r,i)=>[r,i]));regions.sort((a,b)=>{const ai=regionOrder.indexOf(a),bi=regionOrder.indexOf(b);return(ai<0?regionOrder.length+regionIndex.get(a):ai)-(bi<0?regionOrder.length+regionIndex.get(b):bi);});
 regionSelect.innerHTML='<option value="all">全部區域</option>'+regions.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('');regionLabel.appendChild(regionSelect);
 controls.insertBefore(regionLabel,controls.querySelector('label:has(.search-category)'));controls.appendChild(prices);
 const catSelect=controls.querySelector('.search-category');[...catSelect.options].forEach(o=>{if(o.value){const k=o.value;o.value=k;o.textContent=k+'（'+week.transactions.filter(t=>(t.property_category||t.product_type)===k).length+'）';}});
 overview.appendChild(controls);oldFilters.hidden=true;store.appendChild(oldFilters);
 overview.insertAdjacentHTML('beforeend','<p class="directory-help">選擇社區或案件，查看成交明細與同社區在售。</p><p class="live-count" aria-live="polite"></p><p class="directory-catalog-count" aria-live="polite"></p><div class="directory-catalog"></div><p class="directory-empty empty" role="status" hidden>查無符合條件的成交</p>');
 const catalog=overview.querySelector('.directory-catalog');
 if(week.inventory_status){
 const sortLabel=document.createElement('label');
 sortLabel.className='directory-stock-sort';
 sortLabel.innerHTML='在售戶數排序<select aria-label="在售戶數排序"><option value="original">依區域與來源順序</option><option value="desc">在售戶數由多至少</option><option value="asc">在售戶數由少至多</option></select>';
 controls.appendChild(sortLabel);
 const sorting=sortLabel.querySelector('select');
 const sortEntries=()=>{for(const section of catalog.children){const list=section.querySelector('.directory-region-entries');const buttons=[...list.children];const number=b=>Number(b.dataset.units);const ordered=buttons.sort((a,b)=>{const direction=sorting.value==='desc'?-1:1;const change=sorting.value==='original'?0:direction*(number(a)-number(b));return change||Number(a.dataset.order)-Number(b.dataset.order);});ordered.forEach(b=>list.appendChild(b));}};
 sorting.addEventListener('input',sortEntries);
 controls.querySelector('.reset-search').addEventListener('click',()=>{sorting.value='original';sortEntries();});
 }
 regions.forEach((r,i)=>{
  const section=document.createElement('section');section.className='directory-region';section.setAttribute('aria-labelledby',week.run_id+'-region-'+i);
  const rs=entries.filter(e=>e.transactions[0].region===r);
  section.innerHTML=`<div class="directory-region-heading"><h3 id="${esc(week.run_id)}-region-${i}">${esc(r)}</h3><span>${rs.reduce((n,e)=>n+e.transactions.length,0)} 筆成交</span></div><div class="directory-region-entries"></div>`;
  rs.forEach(entry=>{const b=makeButton('','directory-entry'),units=entry.inventory?.listings.length||0;
   b.dataset.directoryKey=entry.key;b.dataset.units=units;b.dataset.order=entry.transactions[0].display_order;b.setAttribute('aria-label',entry.name+'，'+(entry.inventory?'查看社區商品櫃':'查看成交詳情'));
   b.innerHTML=`<span class="directory-entry-copy"><strong>${esc(entry.name)}</strong><span class="directory-entry-meta"></span>${units?`<span class="directory-entry-stock">在售 ${units} 戶</span>`:''}</span><span class="directory-entry-price"><small>成交</small><span><strong></strong><em> 萬</em></span></span><span class="directory-entry-arrow" aria-hidden="true">›</span>`;
   b.addEventListener('click',()=>openDetail(panel,entry.key));entry.button=b;section.querySelector('.directory-region-entries').appendChild(b);
  });catalog.appendChild(section);
 });
 const latestTime=week.final_verified_at?new Date(week.final_verified_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}):'未提供';
 overview.insertAdjacentHTML('beforeend',`<div class="directory-coverage"><p>${esc(week.source_note||'成交依該週提供情資，非政府即時實價登錄。')}</p><p>${week.inventory_status==='verification_pending'?'本期在售查核尚未完成，社區頁會個別標示目前的確認狀態。':'在售資料確認至：'+esc(latestTime)+'（台北）。部分來源尚未確認，物件資訊以原平台為準。'+(week.inventory_status?'':'不代表全市場庫存。')}</p></div>`);
 const detail=document.createElement('section');detail.className='directory-detail';detail.hidden=true;detail.setAttribute('aria-label','社區商品櫃');
 detail.innerHTML='<button class="directory-back" type="button">← 返回本週總目錄</button><p class="directory-detail-location"></p><h2 class="directory-detail-title"></h2><p class="directory-detail-range" hidden></p><div class="directory-detail-body"></div><button class="directory-back directory-back-bottom" type="button">← 返回本週總目錄</button>';
 detail.querySelectorAll('.directory-back').forEach(b=>b.addEventListener('click',()=>closeDetail(panel)));
 const state={week,entries,rows,overview,store,detail,active:null,scroll:0};states.set(panel,state);
 panel.replaceChildren(overview,detail,store);
 regionSelect.addEventListener('change',()=>{panel.dataset.region=regionSelect.value;applyFilters(panel);});
 updateOverview(panel);
}
const baseApply=applyFilters;
applyFilters=function(panel){const n=baseApply(panel);updateOverview(panel);return n;};
const baseSelect=selectWeek;
selectWeek=function(index){states.forEach((state,p)=>closeDetail(p,{restore:false,route:false}));if(routeIsActive)writeRoute(panels[index],null);baseSelect(index);const stock=panels[index].querySelector('.directory-stock-sort select');
 if(stock){stock.value='original';stock.dispatchEvent(new Event('input'));}
 if(DATA.weeks[index].inventory_status==='verification_pending')document.getElementById('hero-status').textContent='本週成交 × 在售確認中';
 document.body.classList.toggle('directory-active',states.has(panels[index]));};
panels.forEach(panel=>{const week=DATA.weeks.find(w=>w.run_id===panel.dataset.week);if(week)mount(panel,week);});
selectWeek(0);
function openRoute(params){const week=params.get('week'),key=params.get('case'),index=DATA.weeks.findIndex(w=>w.run_id===week);if(index<0||!key||!states.has(panels[index]))return;selectWeek(index);openDetail(panels[index],key,{route:false});writeRoute(panels[index],key);}
openRoute(routeParams);
function syncRoute(){const p=new URLSearchParams(location.hash.slice(1));if(p.get('case'))openRoute(p);else states.forEach((s,panel)=>closeDetail(panel,{route:false}));}
window.addEventListener('hashchange',syncRoute);
window.addEventListener('popstate',syncRoute);
})();
