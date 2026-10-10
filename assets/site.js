// 1) Mosaic: rows of boxes always add up to the full width, so there are never holes.
function mosaic(el){
  var cols=innerWidth>=768?4:2;
  if(!el._orig)el._orig=[].slice.call(el.children);
  var rest=el._orig.map(function(c){return{el:c,w:Math.min(+(cols<4&&c.dataset.m?c.dataset.m:c.dataset.w)||1,cols),h:+c.dataset.h||1}}),rows=[];
  while(rest.length){
    var first=rest.shift(),row=[first],space=cols-first.w;
    while(space>0){
      var i=-1;for(var j=0;j<Math.min(rest.length,5);j++){if(rest[j].w<=space){i=j;break}}
      if(i<0)break;var it=rest.splice(i,1)[0];row.push(it);space-=it.w;
    }
    if(space>0)row[row.length-1].w+=space;
    rows.push(row);
  }
  el.style.setProperty('--cols',cols);
  el.style.gridTemplateRows=rows.map(function(r){
    return'minmax('+(cols>2?150:110)+'px,'+Math.max.apply(null,r.map(function(x){return x.h}))+'fr)';
  }).join(' ');
  rows.forEach(function(r){r.forEach(function(x){x.el.style.gridColumn='span '+x.w;el.appendChild(x.el)})});
}
var mz=document.querySelector('.mosaic'),lastCols=0;
function lay(){var c=innerWidth>=768?4:2;if(mz&&c!==lastCols){lastCols=c;mosaic(mz)}}
lay();addEventListener('resize',lay);

// 2) Tap a box: its color grows to fill the screen, then the page opens already in that color.
function cover(color,r){
  var c=document.createElement('div');c.className='cover';
  c.style.cssText='background:'+color+';left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px';
  document.body.appendChild(c);return c;
}
var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
document.querySelectorAll('a.cell').forEach(function(a){
  a.addEventListener('click',function(e){
    var h=a.getAttribute('href');
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0||a.target==='_blank'||!h||h==='#')return;
    e.preventDefault();
    if(a.dataset.id)sessionStorage.setItem('openedTile',a.dataset.id);
    if(reduce)return location.href=a.href;
    var c=cover(getComputedStyle(a).backgroundColor,a.getBoundingClientRect());
    requestAnimationFrame(function(){requestAnimationFrame(function(){c.style.left=c.style.top='0';c.style.width='100vw';c.style.height='100vh'})});
    setTimeout(function(){location.href=a.href},400);
  });
});

// 3) Coming back home from a section: the full-screen color shrinks back into its box.
(function(){
  var id=sessionStorage.getItem('openedTile');if(!id)return;
  sessionStorage.removeItem('openedTile');
  var tile=document.querySelector('a.cell[data-id="'+id+'"]');if(!tile||reduce)return;
  try{var p=new URL(document.referrer).pathname.replace(/index\.html$/,'');if(!p.endsWith('/'+id+'/'))return}catch(e){return}
  var c=cover(getComputedStyle(tile).backgroundColor,{left:0,top:0,width:innerWidth,height:innerHeight});
  c.style.transition='none';void c.offsetWidth;c.style.transition='';
  requestAnimationFrame(function(){requestAnimationFrame(function(){
    var r=tile.getBoundingClientRect();c.style.left=r.left+'px';c.style.top=r.top+'px';c.style.width=r.width+'px';c.style.height=r.height+'px';
  })});
  setTimeout(function(){c.remove()},450);
})();
addEventListener('pageshow',function(e){if(e.persisted)document.querySelectorAll('.cover').forEach(function(c){c.remove()})});
