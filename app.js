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

/* ---- メモ用の簡易Markdown（外部ライブラリなし・HTMLは必ずエスケープ） ---- */
function inline(s){
  var hold=[];
  function put(h){hold.push(h);return '\u0000'+(hold.length-1)+'\u0000';}
  s=esc(String(s==null?'':s).replace(/\u0000/g,''));
  s=s.replace(/`([^`]+)`/g,function(_,c){return put('<code>'+c+'</code>');});
  s=s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,function(_,t,u){return put('<a target="_blank" rel="noopener" href="'+u+'">'+t+'</a>');});
  s=s.replace(/https?:\/\/[A-Za-z0-9\-._~:\/?#@!$&';=%+*,\[\]]+/g,function(u){return put('<a target="_blank" rel="noopener" href="'+u+'">'+u+'</a>');});
  s=s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/~~(.+?)~~/g,'<del>$1</del>').replace(/==(.+?)==/g,'<mark>$1</mark>');
  while(/\u0000\d+\u0000/.test(s))s=s.replace(/\u0000(\d+)\u0000/g,function(_,i){return hold[+i];});
  return s;
}
function hash(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36);}
function md(src,ck){
  var L=String(src||'').replace(/\r\n?/g,'\n').split('\n'),out=[],i=0,m;
  var LI=/^(\s*)([-*+]|\d+[.)])\s+(.*)$/,HR=/^\s*([-*_])(\s*\1){2,}\s*$/,TB=/^\s*\|.*\|\s*$/,SEP=/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;
  function cells(r){return r.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(function(c){return c.trim();});}
  function blockStart(k){var l=L[k];return /^\s*$/.test(l)||/^#{1,4}\s/.test(l)||HR.test(l)||/^\s*>/.test(l)||LI.test(l)||(TB.test(l)&&k+1<L.length&&SEP.test(L[k+1]));}
  while(i<L.length){
    var ln=L[i];
    if(/^\s*$/.test(ln)){i++;continue;}
    if((m=/^(#{1,4})\s+(.*)$/.exec(ln))){out.push('<h'+(m[1].length+1)+'>'+inline(m[2])+'</h'+(m[1].length+1)+'>');i++;continue;}
    if(HR.test(ln)){out.push('<hr>');i++;continue;}
    if(/^\s*>/.test(ln)){
      var q=[];while(i<L.length&&/^\s*>/.test(L[i])){q.push(L[i].replace(/^\s*>\s?/,''));i++;}
      out.push('<blockquote>'+md(q.join('\n'),ck)+'</blockquote>');continue;
    }
    if(TB.test(ln)&&i+1<L.length&&SEP.test(L[i+1])){
      var head=cells(ln);i+=2;var rows=[];
      while(i<L.length&&TB.test(L[i])){rows.push(cells(L[i]));i++;}
      out.push('<div class="tbl"><table><thead><tr>'+head.map(function(c){return '<th>'+inline(c)+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+r.map(function(c){return '<td>'+inline(c)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>');
      continue;
    }
    if(LI.test(ln)){
      var items=[];
      while(i<L.length&&(m=LI.exec(L[i]))){items.push({d:Math.floor(m[1].replace(/\t/g,'  ').length/2),o:/\d/.test(m[2].charAt(0)),t:m[3]});i++;}
      var html='',st=[];
      items.forEach(function(it){
        while(st.length&&st[st.length-1].d>it.d)html+='</li></'+(st.pop().o?'ol':'ul')+'>';
        if(st.length&&st[st.length-1].d===it.d)html+='</li>';
        else{html+='<'+(it.o?'ol':'ul')+'>';st.push({d:it.d,o:it.o});}
        var c=/^\[([ xX])\]\s+(.*)$/.exec(it.t);
        if(c){
          var k=hash(c[2]);ck.seen[k]=(ck.seen[k]||0)+1;k+=':'+ck.seen[k.split(':')[0]];
          html+='<li class="task"><label class="ck"><input type="checkbox" data-k="'+k+'"'+((ck.saved[k]||(!(k in ck.saved)&&c[1]!==' '))?' checked':'')+'><span>'+inline(c[2])+'</span></label>';
        }else html+='<li>'+inline(it.t);
      });
      while(st.length)html+='</li></'+(st.pop().o?'ol':'ul')+'>';
      out.push(html);continue;
    }
    var p=[ln];i++;
    while(i<L.length&&!blockStart(i)){p.push(L[i]);i++;}
    out.push('<p>'+p.map(inline).join('<br>')+'</p>');
  }
  return out.join('');
}

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

function renderTrip(id,view,sub){
  fetchJson('trips/'+encodeURIComponent(id)+'.json').then(function(trip){
    document.title=trip.title+' | 家族旅行のしおり';
    var today=todayStr(),cur=0;
    trip.days.forEach(function(d,i){if(d.date===today)cur=i;});
    var key='shiori:'+id,mkey=key+':memo';
    var memos=(trip.memos||[]).filter(function(m){return m&&m.body!=null;});
    var hasMemo=memos.length>0;
    var curMemo=0;memos.forEach(function(m,i){if(sub&&String(m.id||i+1)===sub)curMemo=i;});
    var views=hasMemo?'<div class="views"><button class="view" data-v="plan">🗓 行程</button><button class="view" data-v="memo">📝 メモ</button></div>':'';
    var dtabs='<div class="tabs" data-for="plan">'+trip.days.map(function(d,i){return '<button class="tab dt" data-d="'+i+'">'+esc(d.label)+'<small>'+esc(d.short||d.date)+'</small></button>';}).join('')+'</div>';
    var mtabs=memos.length>1?'<div class="tabs mtabs" data-for="memo">'+memos.map(function(m,i){return '<button class="tab mt" data-m="'+i+'">'+esc((m.icon||'📝')+' '+(m.title||'メモ'))+'</button>';}).join('')+'</div>':'';
    var head='<a class="back" href="#/">← 旅行一覧</a><div class="trip-head"><h1>'+esc(trip.title)+'</h1><div class="d">'+esc(trip.dates||'')+(trip.members?' ／ '+esc(trip.members):'')+'</div></div>';
    var days=trip.days.map(function(d,i){return '<ol class="tl" data-day="'+i+'" hidden>'+d.items.map(itemHtml).join('')+'</ol>';}).join('');
    var pack='';
    if(trip.packing&&trip.packing.length){
      var saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}');}catch(e){}
      pack='<section class="pack"><h3>🎒 '+esc(trip.packingTitle||'持ち物チェック')+'</h3>'+trip.packing.map(function(p,i){return '<label><input type="checkbox" data-p="'+i+'"'+(saved[i]?' checked':'')+'><span>'+esc(p)+'</span></label>';}).join('')+'<div class="note">チェックはこの端末だけに保存されます（家族とは共有されません）。</div></section>';
    }
    var memoSaved={};try{memoSaved=JSON.parse(localStorage.getItem(mkey)||'{}');}catch(e){}
    var memoHtml=memos.map(function(m,i){
      var body=Array.isArray(m.body)?m.body.join('\n'):String(m.body);
      var ck={saved:memoSaved,seen:{}};
      return '<article class="md" data-m="'+i+'" hidden><div class="mhead">'+esc((m.icon||'📝')+' '+(m.title||'メモ'))+'</div><div class="toc" hidden></div>'+md(body,ck)+'<div class="note">チェックはこの端末だけに保存されます。</div></article>';
    }).join('');
    var foot=trip.note?'<p class="foot">'+esc(trip.note)+'</p>':'';
    app.innerHTML=head+'<div class="nav">'+views+dtabs+mtabs+'</div><div class="pane" data-pane="plan">'+days+pack+'</div>'+(hasMemo?'<div class="pane" data-pane="memo" hidden>'+memoHtml+'</div>':'')+foot;

    function showDay(i){
      [].forEach.call(app.querySelectorAll('.dt'),function(t){t.classList.toggle('on',+t.dataset.d===i);});
      [].forEach.call(app.querySelectorAll('.tl'),function(t){t.hidden=+t.dataset.day!==i;});
      mark(trip,i,today);
    }
    function showMemo(i){
      [].forEach.call(app.querySelectorAll('.mt'),function(t){t.classList.toggle('on',+t.dataset.m===i);});
      [].forEach.call(app.querySelectorAll('.md'),function(t){t.hidden=+t.dataset.m!==i;});
    }
    var curView='plan';
    function setView(v,fromUser){
      curView=v;
      [].forEach.call(app.querySelectorAll('.view'),function(b){b.classList.toggle('on',b.dataset.v===v);});
      [].forEach.call(app.querySelectorAll('.pane'),function(p){p.hidden=p.dataset.pane!==v;});
      [].forEach.call(app.querySelectorAll('.nav .tabs'),function(t){t.hidden=t.dataset.for!==v;});
      if(fromUser){
        window.scrollTo(0,0);
        try{history.replaceState(null,'','#/'+id+(v==='memo'?'/memo'+(memos.length>1?'/'+(memos[curMemo].id||curMemo+1):''):''));}catch(e){}
      }
    }
    // 目次（見出しが3つ以上あるメモだけ）
    [].forEach.call(app.querySelectorAll('.md'),function(art){
      var hs=[].slice.call(art.querySelectorAll('h2,h3,h4,h5')),cnt={};
      hs.forEach(function(h){cnt[h.tagName]=(cnt[h.tagName]||0)+1;});
      var tag=['H2','H3','H4','H5'].filter(function(t){return cnt[t]>=2;})[0];
      if(!tag)return;
      var tg=hs.filter(function(h){return h.tagName===tag;});
      if(tg.length<3)return;
      var toc=art.querySelector('.toc');toc.hidden=false;
      tg.forEach(function(h){var b=document.createElement('button');b.type='button';b.textContent=h.textContent;b.addEventListener('click',function(){h.scrollIntoView({behavior:'smooth',block:'start'});});toc.appendChild(b);});
    });
    app.querySelector('.nav').addEventListener('click',function(e){
      var v=e.target.closest('.view');if(v){setView(v.dataset.v,true);return;}
      var t=e.target.closest('.dt');if(t){showDay(+t.dataset.d);return;}
      var m=e.target.closest('.mt');if(m){curMemo=+m.dataset.m;showMemo(curMemo);window.scrollTo(0,0);setView('memo',true);}
    });
    app.querySelectorAll('.pack input').forEach(function(c){c.addEventListener('change',function(){var s={};app.querySelectorAll('.pack input').forEach(function(x){if(x.checked)s[x.dataset.p]=1;});try{localStorage.setItem(key,JSON.stringify(s));}catch(e){}});});
    app.querySelectorAll('.md input[data-k]').forEach(function(c){c.addEventListener('change',function(){var s={};app.querySelectorAll('.md input[data-k]').forEach(function(x){s[x.dataset.k]=x.checked?1:0;});try{localStorage.setItem(mkey,JSON.stringify(s));}catch(e){}});});
    showDay(cur);
    if(hasMemo)showMemo(curMemo);
    setView(hasMemo&&view==='memo'?'memo':'plan',false);
    if(window._tick)clearInterval(window._tick);
    window._tick=setInterval(function(){var o=app.querySelector('.dt.on');if(o&&curView==='plan')mark(trip,+o.dataset.d,today);},60000);
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
function route(){var h=location.hash.replace(/^#\/?/,'').split('/');window.scrollTo(0,0);h[0]?renderTrip(decodeURIComponent(h[0]),h[1],h[2]):renderList();}
window.addEventListener('hashchange',route);
route();
})();
