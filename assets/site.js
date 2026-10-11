var REDUCE=matchMedia('(prefers-reduced-motion:reduce)').matches;
// 1) Bricks: the screen is cut into random rectangles that always fit together with no gaps.
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function part(items,x,y,w,h,r,out){
  if(items.length===1){out.push({it:items[0],x:x,y:y,w:w,h:h});return}
  var tot=0,i;items.forEach(function(q){tot+=q.wt});
  var tgt=tot*(.3+.4*r()),acc=0,k=1;
  for(i=0;i<items.length-1;i++){acc+=items[i].wt;k=i+1;if(acc>=tgt)break}
  var a=items.slice(0,k),b=items.slice(k),fa=0;a.forEach(function(q){fa+=q.wt});fa/=tot;
  if(w/h*(.7+.6*r())>1){var wa=w*fa;part(a,x,y,wa,h,r,out);part(b,x+wa,y,w-wa,h,r,out)}
  else{var ha=h*fa;part(a,x,y,w,ha,r,out);part(b,x,y+ha,w,h-ha,r,out)}
}
function touch(a,b){
  var ox=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x),oy=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
  return(Math.abs(a.x+a.w-b.x)<2||Math.abs(b.x+b.w-a.x)<2)&&oy>6||(Math.abs(a.y+a.h-b.y)<2||Math.abs(b.y+b.h-a.y)<2)&&ox>6;
}
var mz=document.querySelector('.mosaic'),lastW=0;
// a brick must be wide enough for its longest title word, so words never split mid-way
function wordW(c,mob){var t=c.querySelector('.t');if(!t||t.classList.contains('xl'))return 0;
  var L=0;t.textContent.split(/\s+/).forEach(function(w){L=Math.max(L,w.length)});return L*(mob?11.5:12.5)+(mob?36:56)}
function lay(){
  if(!mz)return;var W=mz.parentNode.clientWidth,mob=W<768;
  if(W===lastW)return;lastW=W;
  var kids=[].slice.call(mz.children),top=mz.getBoundingClientRect().top+scrollY;
  var avail=innerHeight-top-(document.body.classList.contains('page')?0:(mob?8:24));
  var need=kids.length*(mob?30000:38000)/W,H=Math.round(Math.max(avail,need,300));
  var base=+mz.dataset.seed||1,best=null;
  for(var s=1;s<=120;s++){
    var r=rng(base*1000+s*7919),its=kids.map(function(c){return{el:c,wt:(+c.dataset.wt||1)*(.5+1.0*r()),
      mw:Math.max(+c.dataset[mob?'mwm':'mw']||(mob?110:140),wordW(c,mob)),mh:+c.dataset.mh||(mob?85:105)}}),out=[];
    part(its,0,0,W,H,r,out);
    var sc=Math.min.apply(null,out.map(function(o){return Math.min(o.w/o.it.mw,o.h/o.it.mh)}));
    if(!best||sc>best.sc)best={sc:sc,out:out};
    if(sc>=1)break;
  }
  var out=best.out;mz.style.height=H+'px';
  var tones=mz.dataset.tones&&JSON.parse(mz.dataset.tones);
  if(tones){
    out.forEach(function(o){var t=o.it.el.dataset.tone;o.tone=t!==undefined?+t:null});
    out.forEach(function(o,i){
      if(o.tone!==null)return;var used={};
      out.forEach(function(p,j){if(j!==i&&p.tone!==null&&touch(o,p))used[p.tone]=1});
      var pick=-1;for(var t=0;t<tones.length;t++){var tt=(i+t)%tones.length;if(!used[tt]){pick=tt;break}}
      o.tone=pick<0?i%tones.length:pick;
    });
  }
  out.forEach(function(o){
    var s=o.it.el.style;s.left=(o.x/W*100)+'%';s.top=o.y+'px';s.width=(o.w/W*100)+'%';s.height=o.h+'px';
    if(tones){s.setProperty('--c',tones[o.tone][0]);s.setProperty('--fg',tones[o.tone][1])}
  });
}
lay();addEventListener('resize',function(){clearTimeout(lay.t);lay.t=setTimeout(lay,120)});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){lastW=0;lay()});

// 2) Tap a brick: its color grows to fill the screen, then the page opens.
function cover(color,r){
  var c=document.createElement('div');c.className='cover';
  c.style.cssText='background:'+color+';left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px';
  document.body.appendChild(c);return c;
}
document.querySelectorAll('a.cell').forEach(function(a){
  a.addEventListener('click',function(e){
    var h=a.getAttribute('href');
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0||a.target==='_blank'||!h||h==='#')return;
    e.preventDefault();
    if(a.dataset.id)sessionStorage.setItem('openedTile',a.dataset.id);
    if(REDUCE)return location.href=a.href;
    var c=cover(getComputedStyle(a).backgroundColor,a.getBoundingClientRect());
    requestAnimationFrame(function(){requestAnimationFrame(function(){c.style.left=c.style.top='0';c.style.width='100vw';c.style.height='100vh'})});
    setTimeout(function(){location.href=a.href},400);
  });
});

// 3) Coming back home from a section: the full-screen color shrinks back into its brick.
(function(){
  var id=sessionStorage.getItem('openedTile');if(!id)return;
  sessionStorage.removeItem('openedTile');
  var tile=document.querySelector('a.cell[data-id="'+id+'"]');if(!tile||REDUCE)return;
  try{var p=new URL(document.referrer).pathname.replace(/index\.html$/,'');if(!p.endsWith('/'+id+'/'))return}catch(e){return}
  var c=cover(getComputedStyle(tile).backgroundColor,{left:0,top:0,width:innerWidth,height:innerHeight});
  c.style.transition='none';void c.offsetWidth;c.style.transition='';
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    var r=tile.getBoundingClientRect();c.style.left=r.left+'px';c.style.top=r.top+'px';c.style.width=r.width+'px';c.style.height=r.height+'px';
  })});
  setTimeout(function(){c.remove()},450);
})();
addEventListener('pageshow',function(e){if(e.persisted)document.querySelectorAll('.cover').forEach(function(c){c.remove()})});
