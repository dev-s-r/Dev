// Tap a tile: its color grows to fill the screen, then the section page opens already in that color.
document.querySelectorAll('a.tile').forEach(function(tile){
  tile.addEventListener('click',function(e){
    if(e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0)return;
    e.preventDefault();
    var r=tile.getBoundingClientRect(),c=document.createElement('div');
    c.className='cover';
    c.style.cssText='background:'+getComputedStyle(tile).backgroundColor+';left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px';
    document.body.appendChild(c);
    var go=function(){location.href=tile.href};
    if(matchMedia('(prefers-reduced-motion:reduce)').matches)return go();
    requestAnimationFrame(function(){requestAnimationFrame(function(){
      c.style.left=c.style.top='0';c.style.width='100vw';c.style.height='100vh';
    })});
    setTimeout(go,400);
  });
});
addEventListener('pageshow',function(){document.querySelectorAll('.cover').forEach(function(c){c.remove()})});
