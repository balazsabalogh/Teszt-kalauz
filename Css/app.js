
const CAT_ICONS={
 sight:'◆',building:'▥',view:'⌃',cafe:'☕',food:'●',bar:'♪',activity:'✦',
 architecture:'⌂',walk:'↝',market:'▦',district:'◇',memorial:'†',wc:'WC'
};
const map=L.map('map',{zoomControl:false,preferCanvas:true}).setView([47.4979,19.0552],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
L.control.zoom({position:'bottomleft'}).addTo(map);

const els={
 sheet:document.querySelector('#sheet'),handle:document.querySelector('#handle'),sheetHead:document.querySelector('#sheetHead'),
 title:document.querySelector('#title'),sub:document.querySelector('#sub'),content:document.querySelector('#content'),
 context:document.querySelector('#context'),contextMenu:document.querySelector('#contextMenu'),topStrip:document.querySelector('#topStrip'),
 topMenu:document.querySelector('#topMenu'),toast:document.querySelector('#toast'),modalBackdrop:document.querySelector('#modalBackdrop'),
 modal:document.querySelector('#modal'),navCard:document.querySelector('#navCard'),navTitle:document.querySelector('#navTitle'),
 navMeta:document.querySelector('#navMeta'),navArrow:document.querySelector('#navArrow')
};
const state={places:[],markers:new Map(),selected:null,panel:'mini',drag:null,userLatLng:null,navTarget:null,navLine:null,watchId:null};
const P={mini:92,peek:156,half:()=>Math.round(innerHeight*.52),full:()=>Math.round(innerHeight*.91)};
const h=s=>typeof P[s]==='function'?P[s]():P[s];

function toast(t){els.toast.textContent=t;els.toast.classList.add('show');clearTimeout(els.toast.t);els.toast.t=setTimeout(()=>els.toast.classList.remove('show'),1400)}
function markerIcon(p,selected=false){
 const html=`<div class="tc-wrap ${p.cat} ${selected?'selected':''}"><div class="tc-pin"><span class="tc-icon">${CAT_ICONS[p.cat]||'•'}</span></div></div>`;
 return L.divIcon({className:'',html,iconSize:[38,43],iconAnchor:[19,43]});
}
function get(id){return state.places.find(p=>p.id===id)}
function setPanel(name,animate=true){
 state.panel=name;
 document.documentElement.style.setProperty('--sheet-h',h(name)+'px');
 els.sheet.style.transition=animate?'height .38s cubic-bezier(.22,.9,.24,1)':'none';
 els.sheet.style.height=h(name)+'px';
}
function updateMarkerSelection(){
 state.markers.forEach((m,id)=>m.setIcon(markerIcon(get(id),id===state.selected)));
}
function selectPlace(id){
 state.selected=id;updateMarkerSelection();const p=get(id);
 map.flyTo([p.lat,p.lon],Math.max(map.getZoom(),15),{duration:.45});
 els.title.textContent=p.name;els.sub.textContent=`${p.label} · ${p.duration} perc`;
 els.content.innerHTML=detailHTML(p);bindDetail(p);setPanel('peek');
}
function detailHTML(p){
 return `<div class="detail-grid"><div class="metric"><b>${p.duration} p</b>Idő</div><div class="metric"><b>${p.price}</b>Ár</div><div class="metric"><b>${p.day}. nap</b>Program</div></div>
 <p class="description">${p.desc}</p><div class="card"><div class="card-main"><b>Megéri?</b><span>${p.worth}</span></div></div>
 <div class="quick"><button class="chip" id="internalNav">➤ Navigáció az appban</button><button class="chip" id="dayBtn">📅 ${p.day}. nap</button></div>`;
}
function bindDetail(p){
 document.querySelector('#internalNav').onclick=()=>startNavigation(p);
 document.querySelector('#dayBtn').onclick=()=>showDay(p.day);
}
function resetPanel(){
 state.selected=null;updateMarkerSelection();els.title.textContent='Budapest tesztútiterv';els.sub.textContent='3 laza nap · 24 hely';renderPlan();setPanel('mini');
}
function card(p){
 return `<div class="card" data-id="${p.id}"><div class="thumb"></div><div class="card-main"><b>${p.order}. ${p.name}</b><span>${p.label} · ${p.duration} perc</span></div><button class="icon-btn" data-nav="${p.id}">➤</button></div>`;
}
function bindCards(){
 document.querySelectorAll('[data-id]').forEach(c=>c.onclick=e=>{if(!e.target.closest('[data-nav]'))selectPlace(c.dataset.id)});
 document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=e=>{e.stopPropagation();startNavigation(get(b.dataset.nav))});
 document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>showDay(+b.dataset.day));
}
function renderPlan(){
 els.content.innerHTML=`<div class="daytabs">${[1,2,3].map(d=>`<button data-day="${d}">${d}. nap</button>`).join('')}</div>`+
 [1,2,3].map(d=>`<h3>${d}. nap</h3>${state.places.filter(p=>p.day===d&&p.cat!=='wc').sort((a,b)=>a.order-b.order).map(card).join('')}`).join('');
 bindCards();
}
function showDay(day){
 state.selected=null;updateMarkerSelection();const arr=state.places.filter(p=>p.day===day&&p.cat!=='wc').sort((a,b)=>a.order-b.order);
 els.title.textContent=`${day}. nap`;els.sub.textContent=`${arr.length} hely · laza budapesti program`;
 els.content.innerHTML=`<div class="daytabs">${[1,2,3].map(d=>`<button class="${d===day?'active':''}" data-day="${d}">${d}. nap</button>`).join('')}</div>${arr.map(card).join('')}`;
 bindCards();setPanel('half');
 const fg=L.featureGroup(arr.map(p=>state.markers.get(p.id)));map.fitBounds(fg.getBounds(),{paddingTopLeft:[30,90],paddingBottomRight:[30,Math.round(innerHeight*.45)]});
}
function showFiltered(fn,label){
 const arr=state.places.filter(fn);els.title.textContent=label;els.sub.textContent=`${arr.length} találat`;els.content.innerHTML=arr.map(card).join('');bindCards();setPanel('half');
}
function bearing(a,b){
 const φ1=a.lat*Math.PI/180,φ2=b.lat*Math.PI/180,Δλ=(b.lng-a.lng)*Math.PI/180;
 const y=Math.sin(Δλ)*Math.cos(φ2),x=Math.cos(φ1)*Math.sin(φ2)-Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
 return (Math.atan2(y,x)*180/Math.PI+360)%360;
}
function updateNavCard(from,target,routeDistance=null){
 const d=routeDistance??map.distance(from,[target.lat,target.lon]);
 const mins=Math.max(1,Math.round(d/80));
 const br=bearing(from,L.latLng(target.lat,target.lon));
 els.navArrow.style.transform=`rotate(${br}deg)`;
 els.navTitle.textContent=target.name;els.navMeta.textContent=`${d<1000?Math.round(d)+' m':(d/1000).toFixed(1)+' km'} · kb. ${mins} perc gyalog`;
 els.navCard.classList.add('show');
}
async function routeFrom(from,target){
 if(state.navLine)map.removeLayer(state.navLine);
 try{
   const url=`https://router.project-osrm.org/route/v1/foot/${from.lng},${from.lat};${target.lon},${target.lat}?overview=full&geometries=geojson`;
   const r=await fetch(url);if(!r.ok)throw new Error();
   const data=await r.json();const rt=data.routes?.[0];if(!rt)throw new Error();
   const latlngs=rt.geometry.coordinates.map(c=>[c[1],c[0]]);
   state.navLine=L.polyline(latlngs,{color:'#c8102e',weight:6,opacity:.9}).addTo(map);
   map.fitBounds(state.navLine.getBounds(),{paddingTopLeft:[25,150],paddingBottomRight:[25,h(state.panel)+30]});
   updateNavCard(from,target,rt.distance);
 }catch{
   state.navLine=L.polyline([from,[target.lat,target.lon]],{color:'#c8102e',weight:5,dashArray:'10 8'}).addTo(map);
   updateNavCard(from,target);toast('Egyszerű irányvonal – útvonal-szolgáltatás nem elérhető');
 }
}
function startNavigation(target){
 state.navTarget=target;
 const use=(ll)=>{state.userLatLng=ll;routeFrom(ll,target)};
 if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(p=>use(L.latLng(p.coords.latitude,p.coords.longitude)),()=>use(map.getCenter()),{enableHighAccuracy:true,timeout:5000});
 } else use(map.getCenter());
}
function stopNavigation(){
 if(state.navLine){map.removeLayer(state.navLine);state.navLine=null}
 els.navCard.classList.remove('show');state.navTarget=null;
}
function showVersions(){
 els.modal.innerHTML=`<h2>Alpha-verziók</h2><p>A régebbi build külön oldalon nyílik meg.</p>
 <a class="version" href="versions/v0.1/index.html">Alpha v0.1 · első interaktív alap</a>
 <a class="version" href="versions/v0.2/index.html">Alpha v0.2 · Budapest</a>
 <a class="version current" href="index.html">Alpha v0.3 · Map Experience (aktuális)</a>
 <button class="chip" id="closeModal">Bezárás</button>`;
 els.modalBackdrop.classList.add('show');document.querySelector('#closeModal').onclick=()=>els.modalBackdrop.classList.remove('show');
}
function showAI(){
 els.context.classList.add('working');toast('A Companion javaslatokat rendez…');
 setTimeout(()=>{els.context.classList.remove('working');els.title.textContent='3 Companion-javaslat';els.sub.textContent='Finom, nem tolakodó segítség';
 els.content.innerHTML=`<div class="card"><div class="card-main"><b>☔ Délután eső várható</b><span>A Gellért-hegyet érdemes előrébb hozni.</span></div></div>
 <div class="card"><div class="card-main"><b>🚻 WC 180 méterre</b><span>Nyitott utility pont.</span></div></div>
 <div class="card"><div class="card-main"><b>☕ Nyugodtabb kávézó</b><span>8 perc kitérő a jelenlegi útvonalról.</span></div></div>`;setPanel('half')},850);
}
function action(name){
 els.contextMenu.classList.remove('open');els.topMenu.classList.remove('open');
 if(name==='plan'){renderPlan();els.title.textContent='Budapest tesztútiterv';els.sub.textContent='3 laza nap · 24 hely';setPanel('half')}
 if(name==='all')showFiltered(()=>true,'Összes teszthely');
 if(name==='fit'){map.fitBounds(L.featureGroup([...state.markers.values()]).getBounds(),{padding:[35,80]});resetPanel()}
 if(name==='versions')showVersions();
 if(name==='nearby'){const c=map.getCenter(),arr=state.places.map(p=>({...p,d:map.distance(c,[p.lat,p.lon])})).sort((a,b)=>a.d-b.d).slice(0,6);els.title.textContent='Körülöttem';els.sub.textContent='A térkép közepéhez legközelebbi helyek';els.content.innerHTML=arr.map(card).join('');bindCards();setPanel('half')}
 if(name==='food')showFiltered(p=>['food','cafe','bar'].includes(p.cat),'Éttermek és bárok');
 if(name==='ai')showAI();
}
function initGestures(){
 let drag=null;
 function begin(e){if(e.target.closest('button'))return;drag={startY:e.clientY,startH:els.sheet.getBoundingClientRect().height,lastY:e.clientY};e.currentTarget.setPointerCapture?.(e.pointerId);els.sheet.classList.add('dragging')}
 function move(e){if(!drag)return;e.preventDefault();drag.lastY=e.clientY;const hh=Math.max(P.mini,Math.min(innerHeight*.94,drag.startH+(drag.startY-e.clientY)));document.documentElement.style.setProperty('--sheet-h',hh+'px');els.sheet.style.height=hh+'px'}
 function end(){if(!drag)return;const dy=drag.startY-drag.lastY,hh=els.sheet.getBoundingClientRect().height;drag=null;els.sheet.classList.remove('dragging');
   if(dy<-28){setPanel('mini');return}
   if(dy>28){if(hh<h('half')-30)setPanel('half');else setPanel('full');return}
   const choices=state.selected?['peek','half','full']:['mini','half','full'];let best=choices[0],dist=Infinity;choices.forEach(s=>{const d=Math.abs(h(s)-hh);if(d<dist){dist=d;best=s}});setPanel(best)
 }
 [els.handle,els.sheetHead].forEach(z=>{z.addEventListener('pointerdown',begin);z.addEventListener('pointermove',move,{passive:false});z.addEventListener('pointerup',end);z.addEventListener('pointercancel',end)});
}
async function init(){
 state.places=await fetch('data/budapest.json').then(r=>r.json());
 state.places.forEach(p=>{const m=L.marker([p.lat,p.lon],{icon:markerIcon(p)}).addTo(map);m.on('click',()=>selectPlace(p.id));state.markers.set(p.id,m)});
 for(const day of [1,2,3]){
  const pts=state.places.filter(p=>p.day===day&&p.cat!=='wc').sort((a,b)=>a.order-b.order).map(p=>[p.lat,p.lon]);
  L.polyline(pts,{color:{1:'#c8102e',2:'#4da3ff',3:'#45c56f'}[day],weight:4,opacity:.62,dashArray:'10 8'}).addTo(map);
 }
 renderPlan();setPanel('mini',false);initGestures();
 map.on('click',()=>{els.contextMenu.classList.remove('open');if(state.selected)resetPanel();else setPanel('mini')});
}
els.context.onclick=e=>{e.stopPropagation();els.contextMenu.classList.toggle('open')};
els.topStrip.onclick=()=>els.topMenu.classList.toggle('open');
document.addEventListener('pointerdown',e=>{if(!els.contextMenu.contains(e.target)&&e.target!==els.context)els.contextMenu.classList.remove('open');if(!els.topMenu.contains(e.target)&&!els.topStrip.contains(e.target))els.topMenu.classList.remove('open')});
document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>action(b.dataset.action));
document.querySelector('#locate').onclick=()=>navigator.geolocation?.getCurrentPosition(p=>{const ll=[p.coords.latitude,p.coords.longitude];map.setView(ll,16);L.circleMarker(ll,{radius:8,color:'#fff',weight:3,fillColor:'#4da3ff',fillOpacity:1}).addTo(map);toast('Aktuális hely megjelenítve')},()=>toast('A helyzet nem érhető el'),{enableHighAccuracy:true});
document.querySelector('#stopNav').onclick=stopNavigation;
els.modalBackdrop.onclick=e=>{if(e.target===els.modalBackdrop)els.modalBackdrop.classList.remove('show')};
window.addEventListener('resize',()=>setPanel(state.panel,false));
init();
