(function(){
'use strict';
var app=document.getElementById('app');
var MODE={car:{i:'🚗',n:'車',tm:'driving'},shinkansen:{i:'🚄',n:'新幹線',tm:'transit'},train:{i:'🚃',n:'電車',tm:'transit'},walk:{i:'🚶',n:'徒歩',tm:'walking'}};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function safeUrl(u){return /^https?:\/\//.test(u||'')?u:'';}
function toMinN(t){var m=/^(\d{1,2}):(\d{2})$/.exec(t||'');return m?(+m[1])*60+(+m[2]):null;}
function calcDur(a,b){var x=toMinN(a),y=toMinN(b);if(x==null||y==null||y<=x)return '';var d=y-x,h=Math.floor(d/60),m=d%60;return h?(m?h+'時間'+m+'分':h+'時間'):m+'分';}
function toMin(t){if(!t)return null;var m=/^(\d{1,2}):(\d{2})$/.exec(t);return m?(+m[1])*60+(+m[2]):null;}
function fetchJson(p){return fetch(p,{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error(p+' '+r.status);return r.json();});}
function todayStr(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function mapUrl(m){
  var dest=m.mapDest||m.to; if(!dest)return '';
  var u='https://www.google.com/maps/dir/?api=1';
  var origin=m.mapOrigin!==undefined?m.mapOrigin:(m.from==='自宅'?null:m.from);
  if(origin)u+='&origin='+encodeURIComponent(origin);
  u+='&destination='+encodeURIComponent(dest)+'&travelmode='+(MODE[m.mode]||MODE.train).tm;
  return u;
}
function placeUrl(q){return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q);}

function renderList(){
  document.title='家族旅行のしおり';
  fetchJson('trips/index.json').then(function(list){
    var t=todayStr();
    list.sort(function(a,b){return a.start<b.start?-1:1;});
    var up=list.filter(function(x){return x.end>=t;}),past=list.filter(function(x){return x.end<t;}).reverse();
    function card(x){return '<a class="trip-link" href="#/'+esc(x.id)+'"><div class="d">'+esc(x.dates)+(x.sample?'<span class="badge tent">サンプル</span>':'')+'</div><div class="t">'+esc(x.title)+'</div><div class="s">'+esc(x.summary)+'</div></a>';}
    var h='';
    if(up.length)h+='<h2 class="sec">これから</h2>'+up.map(card).join('');
    if(past.length)h+='<h2 class="sec">過去の旅行</h2>'+past.map(card).join('');
    app.innerHTML=h||'<p class="empty">まだしおりがありません</p>';
  }).catch(fail);
}

function itemHtml(it,idx){
  var cls='it '+esc(it.type)+(it.tentative?' tent':'');
  var tm=it.t?'<div class="tm">'+esc(it.t)+'</div>':'';
  var b='';
  if(it.type==='event'){
    b+='<div class="ti">'+esc(it.icon||'🎫')+' '+esc(it.title)+(it.tentative?'<span class="badge tent">仮</span>':'')+'<span class="nowtag" hidden>今ここ</span></div>';
    var meta=[];
    if(it.open)meta.push('開場 <b>'+esc(it.open)+'</b>');
    if(it.t)meta.push((it.group?'開演':'開始')+' <b>'+esc(it.t)+'</b>');
    if(it.end)meta.push((it.group?'終演':'終了')+' <b>'+esc(it.end)+'</b>');
    if(meta.length)b+='<div class="meta">'+meta.join(' ／ ')+'</div>';
    if(it.group||it.venue)b+='<div class="meta">'+esc([it.group,it.venue].filter(Boolean).join('・'))+'</div>';
  }else if(it.type==='move'){
    var m=MODE[it.mode]||MODE.train;
    b+='<div class="ti">'+m.i+' '+esc(it.from)+' → '+esc(it.to)+'<span class="nowtag" hidden>今ここ</span></div>';
    var mm=[];
    if(it.t||it.arr)mm.push('<b>'+esc(it.t||'')+(it.arr?' → '+esc(it.arr):'')+'</b>');
    var du=it.dur||calcDur(it.t,it.arr)||'';if(it.mode==='walk')du=du.replace(/^徒歩/,'');mm.push(esc(m.n)+(du?'・'+esc(du):''));
    if(it.detail)mm.push(esc(it.detail));
    b+='<div class="meta">'+mm.join('／')+'</div>';
    if(it.seat)b+='<div class="meta">💺 '+esc(it.seat)+'</div>';
  }else if(it.type==='stay'){
    b+='<div class="ti">🏨 '+esc(it.title)+'<span class="nowtag" hidden>今ここ</span></div>';
    if(it.address)b+='<div class="meta">'+esc(it.address)+'</div>';
    if(it.tel)b+='<div class="meta">☎ <a href="tel:'+esc(it.tel.replace(/[^0-9+]/g,''))+'">'+esc(it.tel)+'</a></div>';
  }else{
    b+='<div>'+esc(it.icon||'📝')+' '+esc(it.text)+(it.tentative?'<span class="badge tent">仮</span>':'')+'<span class="nowtag" hidden>今ここ</span></div>';
  }
  if(it.notes&&it.notes.length)b+='<ul class="notes">'+it.notes.map(function(n){return '<li>'+esc(n)+'</li>';}).join('')+'</ul>';
  var btns='';
  if(it.type==='move'&&!it.noMap){var u=mapUrl(it);if(u)btns+='<a class="btn" target="_blank" rel="noopener" href="'+esc(u)+'">🗺 Googleマップで経路</a>';}
  if((it.type==='event'||it.type==='stay')&&(it.mapQuery||it.venue)&&!it.noMap)btns+='<a class="btn ghost" target="_blank" rel="noopener" href="'+esc(placeUrl(it.mapQuery||it.venue))+'">📍 地図</a>';
  if(it.link&&safeUrl(it.link.url))btns+='<a class="btn ghost" target="_blank" rel="noopener" href="'+esc(it.link.url)+'">🔗 '+esc(it.link.label)+'</a>';
  if(safeUrl(it.ticket))btns+='<a class="btn" target="_blank" rel="noopener" href="'+esc(it.ticket)+'">🎟 チケット</a>';
  if(btns)b+='<div class="btns">'+btns+'</div>';
  return '<li class="'+cls+'" data-i="'+idx+'">'+tm+'<div class="card">'+b+'</div></li>';
}

function renderTrip(id){
  fetchJson('trips/'+encodeURIComponent(id)+'.json').then(function(trip){
    document.title=trip.title+' | 家族旅行のしおり';
    var today=todayStr(),cur=0;
    trip.days.forEach(function(d,i){if(d.date===today)cur=i;});
    var key='shiori:'+id;
    var tabs='<div class="tabs">'+trip.days.map(function(d,i){return '<button class="tab" data-d="'+i+'">'+esc(d.label)+'<small>'+esc(d.short||d.date)+'</small></button>';}).join('')+'</div>';
    var head='<a class="back" href="#/">← 旅行一覧</a><div class="trip-head"><h1>'+esc(trip.title)+'</h1><div class="d">'+esc(trip.dates||'')+(trip.members?' ／ '+esc(trip.members):'')+'</div></div>';
    var days=trip.days.map(function(d,i){return '<ol class="tl" data-day="'+i+'" hidden>'+d.items.map(itemHtml).join('')+'</ol>';}).join('');
    var pack='';
    if(trip.packing&&trip.packing.length){
      var saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}');}catch(e){}
      pack='<section class="pack"><h3>🎒 '+esc(trip.packingTitle||'持ち物チェック')+'</h3>'+trip.packing.map(function(p,i){return '<label><input type="checkbox" data-p="'+i+'"'+(saved[i]?' checked':'')+'><span>'+esc(p)+'</span></label>';}).join('')+'<div class="note">チェックはこの端末だけに保存されます（家族とは共有されません）。</div></section>';
    }
    var foot=trip.note?'<p class="foot">'+esc(trip.note)+'</p>':'';
    app.innerHTML=head+tabs+days+pack+foot;
    function show(i){
      [].forEach.call(app.querySelectorAll('.tab'),function(t){t.classList.toggle('on',+t.dataset.d===i);});
      [].forEach.call(app.querySelectorAll('.tl'),function(t){t.hidden=+t.dataset.day!==i;});
      mark(trip,i,today);
    }
    app.querySelector('.tabs').addEventListener('click',function(e){var t=e.target.closest('.tab');if(t)show(+t.dataset.d);});
    app.querySelectorAll('.pack input').forEach(function(c){c.addEventListener('change',function(){var s={};app.querySelectorAll('.pack input').forEach(function(x){if(x.checked)s[x.dataset.p]=1;});try{localStorage.setItem(key,JSON.stringify(s));}catch(e){}});});
    show(cur);
    if(window._tick)clearInterval(window._tick);
    window._tick=setInterval(function(){var o=app.querySelector('.tab.on');if(o)mark(trip,+o.dataset.d,today);},60000);
  }).catch(fail);
}

function mark(trip,di,today){
  var day=trip.days[di],ol=app.querySelector('.tl[data-day="'+di+'"]');
  if(!ol)return;
  [].forEach.call(ol.querySelectorAll('.it'),function(li){li.classList.remove('now');li.querySelector('.nowtag')&&(li.querySelector('.nowtag').hidden=true);});
  if(day.date!==today)return;
  var n=new Date(),now=n.getHours()*60+n.getMinutes(),hit=-1;
  day.items.forEach(function(it,i){var s=toMin(it.t);if(s!==null&&s<=now)hit=i;});
  if(hit<0)return;
  var li=ol.querySelector('.it[data-i="'+hit+'"]');
  if(li){li.classList.add('now');var tag=li.querySelector('.nowtag');if(tag)tag.hidden=false;}
}

function fail(e){app.innerHTML='<p class="empty">読み込めませんでした。<br><small>'+esc(e.message)+'</small></p>';}
function route(){var h=location.hash.replace(/^#\/?/,'');window.scrollTo(0,0);h?renderTrip(h):renderList();}
window.addEventListener('hashchange',route);
route();
})();
