const slides=[...document.querySelectorAll('.slide')],counter=document.querySelector('output'),bar=document.querySelector('.progress'),menu=document.querySelector('.contents'),modal=document.querySelector('dialog');let current=0,lastFocus;
function syncPageNumbers(){
 const labels=new Map([...menu.querySelectorAll('nav a')].map(a=>{const id=a.dataset.slideId||slides[pageIndex(a.hash)]?.id,c=a.cloneNode(true);c.querySelector('span')?.remove();return[id,c.textContent.trim()]}));
 const links=slides.map((s,i)=>{
  s.dataset.pageNumber=String(i+1);
  s.querySelectorAll(':scope>footer>span,:scope>.mr-foot>span').forEach(e=>{if(/^\s*\d+(?:\s*\/\s*\d+)?\s*$/.test(e.textContent))e.textContent=''});
  let number=s.querySelector(':scope>.page-number');if(!number){number=document.createElement('a');number.className='page-number';s.append(number)}
  number.textContent=`${i+1} / ${slides.length}`;number.setAttribute('aria-label',`第${i+1}页，共${slides.length}页`);if(number.tagName==='A')number.setAttribute('href','#'+s.id);
  const a=document.createElement('a'),n=document.createElement('span');a.href='#'+s.id;a.dataset.slideId=s.id;n.textContent=String(i+1);a.append(n,labels.get(s.id)||s.getAttribute('aria-label')||s.querySelector('h1')?.textContent||`第${i+1}页`);return a;
 });if(menu.dataset.mode!=='chapters')menu.querySelector('nav').replaceChildren(...links);
}
syncPageNumbers();

function fit(){document.documentElement.style.setProperty('--scale',Math.min((document.documentElement.clientWidth-32)/1600,1))}addEventListener('resize',()=>{fit();go(current)});fit();
function pageIndex(hash){const number=/^#p(\d+)$/.exec(hash);if(number)return Math.max(0,Math.min(slides.length-1,Number(number[1])-1));return Math.max(0,slides.findIndex(s=>s.id===hash.slice(1)))}
function render(){counter.value=`第 ${current+1} 页 / 共 ${slides.length} 页`;const hash="#"+slides[current].id;if(location.hash!==hash)history.replaceState(null,"",hash);bar.style.width=`${(current+1)/slides.length*100}%`}
function go(n){current=Math.max(0,Math.min(slides.length-1,n));slides[current].parentElement.scrollIntoView({behavior:'instant',block:'start'});render()}
let queued=false;addEventListener('scroll',()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{let best=Infinity;slides.forEach((s,i)=>{let r=s.getBoundingClientRect(),d=Math.abs(r.top+r.height/2-innerHeight/2);if(d<best){best=d;current=i}});render();queued=false})},{passive:true});
function toggleMenu(show){menu.hidden=!show;if(show){lastFocus=document.activeElement;menu.querySelector('button').focus()}else lastFocus?.focus()}
document.querySelector('[data-prev]').onclick=()=>go(current-1);document.querySelector('[data-next]').onclick=()=>go(current+1);document.querySelector('[data-menu]').onclick=()=>toggleMenu(true);menu.querySelector('button').onclick=()=>toggleMenu(false);menu.querySelectorAll('a').forEach(a=>a.onclick=e=>{e.preventDefault();toggleMenu(false);go(pageIndex(a.hash))});
document.querySelector('[data-full]').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{}};document.querySelector('[data-print]').onclick=()=>window.print();
document.addEventListener('keydown',e=>{if(e.key==='Escape'){toggleMenu(false);if(modal.open)modal.close();return}if(modal.open)return;if(!menu.hidden){if(e.key==='Tab'){const focus=[...menu.querySelectorAll('button,a')],first=focus[0],last=focus.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}return}if(e.ctrlKey||e.metaKey||e.altKey)return;if(e.key==='ArrowRight'){e.preventDefault();go(current+1)}if(e.key==='ArrowLeft'){e.preventDefault();go(current-1)}});
document.querySelectorAll('.zoom').forEach(b=>b.onclick=()=>{modal.querySelector('img').src=b.dataset.src;modal.querySelector('img').alt=b.dataset.alt;modal.querySelector('p').textContent=b.dataset.alt;modal.showModal()});modal.querySelector('button').onclick=()=>modal.close();modal.onclick=e=>{if(e.target===modal)modal.close()};addEventListener('hashchange',()=>go(pageIndex(location.hash)));const initialPage=pageIndex(location.hash);requestAnimationFrame(()=>go(initialPage));
