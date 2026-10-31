import * as THREE from 'three';
import {OrbitControls} from 'three/addons/OrbitControls.js';
const $=s=>document.querySelector(s), canvas=$('#scene');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0xeef1f4);renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.01,50),controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.minDistance=.6;controls.maxDistance=6;controls.maxPolarAngle=Math.PI*.97;
scene.add(new THREE.HemisphereLight(0xffffff,0x8293a1,2.5));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(2,4,3);light.castShadow=true;light.shadow.mapSize.set(2048,2048);Object.assign(light.shadow.camera,{left:-3,right:3,top:3,bottom:-3});light.shadow.bias=-.0003;scene.add(light);
const env=new THREE.Group();scene.add(env);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshStandardMaterial({color:0xe8edf0,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.002;floor.receiveShadow=true;env.add(floor);
const wall=new THREE.Mesh(new THREE.PlaneGeometry(6,3),new THREE.MeshStandardMaterial({color:0xdde4e7,roughness:1,side:THREE.DoubleSide}));wall.position.set(0,1.5,-.30);wall.receiveShadow=true;env.add(wall);wall.visible=false;
const grid=new THREE.GridHelper(6,30,0xcbd4da,0xdbe2e7);grid.position.y=.001;grid.material.transparent=true;grid.material.opacity=.3;env.add(grid);
const root=new THREE.Group();scene.add(root);
// Metric coordinate system: X = width, Y = up, Z = front motor (-) to rear roller (+).
const defs=[
 ['A','跑带 / 跑板','#465666','升级目标有效跑带 450 × 1300 mm，现款为 450 × 1200 mm。保持前端位置，向后延长 100 mm；整机尺寸仍待确认。',false],
 ['B','金属侧框','#598bbd','现款两侧承力金属框架。与外侧包边分开，便于讨论覆盖范围。',false],
 ['C','两侧包边 · 拟新增','#36b6c5','左右侧框的外观包覆件，沿跑台长边布置。当前仅表示位置与包覆关系。',true],
 ['D','弹性外挂件 × 2','#bc81d2','左右各一个拟新增硅胶外挂件，用来表达跑台弹性。此模型不代表已确定减震结构。',true],
 ['E','底部 H 架','#d2aa50','前部 H 形抬升支撑架：左右支腿与连接横梁。依据新提供的电商侧视图修正；转轴与尺寸仍为近似。',false],
 ['F','抬升架 / 侧面','#e17c57','中央抬升执行杆与侧面连接区，依据现款电商图表达。支持观察 0–15°姿态；不是已验证的机构运动学。',false],
 ['G','竖放防滑支撑 × 2','#edb02d','拟新增两个橡胶 / 硅胶支撑块，装于前端底架。竖放时最低面接地，轮子离地；固定、重心及防倾倒需后续验证。',true],
 ['H','轮子 / 后脚','#68737c','保留移动轮与后脚的示意。竖放方案把接地支撑转移至 G，不再让轮子作为最低接地点。',false],
 ['I','立柱 / 转轴','#91aaa7','沿用双立柱和下端折叠转轴的大体关系；折叠位置为交流示意。',false],
 ['J','面板 / 扶手','#8092bd','保留横向控制面板、两侧扶手、按键及显示区的基本布局。现阶段不改交互结构。',false],
 ['K','电机盖 / 端盖','#b5bec5','前端电机盖及跑台后端护盖；用作现有外壳的空间参照。',false]
];
const parts={},pickables=[],labels=[];let state='open',selected=null,explode=0,slope=0;const liftRails=[],liftWheels=[];let liftCross,actuator;const fold=new THREE.Group();fold.position.set(0,.245,-.59);root.add(fold);const consolePivot=new THREE.Group();consolePivot.position.set(0,.84,.25);fold.add(consolePivot);
for(const [id,name,color,desc,isNew] of defs){const group=new THREE.Group();group.name=id+' '+name;root.add(group);parts[id]={id,name,color,desc,isNew,group,meshes:[],visible:true};const row=document.createElement('div');row.className='part';row.dataset.id=id;row.innerHTML=`<input type="checkbox" checked aria-label="显示${name}"><span class="swatch" style="background:${color}"></span><span class="id">${id}</span><span>${name}</span>`;row.onclick=e=>{if(e.target.tagName==='INPUT'){parts[id].visible=e.target.checked;updateVisibility()}else select(id)};$('#parts').append(row);const label=document.createElement('button');label.className='label';label.style.setProperty('--c',color);label.textContent=id+' '+name;label.onclick=()=>select(id);$('#labels').append(label);labels.push({id,element:label});}
fold.add(parts.I.group);consolePivot.add(parts.J.group);
function mat(id,color){return new THREE.MeshStandardMaterial({color:color||parts[id].color,roughness:id==='B'?.45:.72,metalness:id==='B'?.45:.08});}
function add(id,geo,pos,rot,color){const mesh=new THREE.Mesh(geo,mat(id,color));mesh.position.set(...pos);if(rot)mesh.rotation.set(...rot);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.part=id;mesh.name=id+'-'+parts[id].meshes.length;parts[id].group.add(mesh);parts[id].meshes.push(mesh);pickables.push(mesh);return mesh;}
function box(id,size,pos,color){return add(id,new THREE.BoxGeometry(...size),pos,null,color)}
function round(id,size,pos,r=.02,color){const [w,h,d]=size,radius=Math.min(r,w/2-.001,h/2-.001);const s=new THREE.Shape();s.moveTo(-w/2+radius,-h/2);s.lineTo(w/2-radius,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+radius);s.lineTo(w/2,h/2-radius);s.quadraticCurveTo(w/2,h/2,w/2-radius,h/2);s.lineTo(-w/2+radius,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-radius);s.lineTo(-w/2,-h/2+radius);s.quadraticCurveTo(-w/2,-h/2,-w/2+radius,-h/2);const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:false,curveSegments:5});g.translate(0,0,-d/2);return add(id,g,pos,null,color)}
function beam(id,a,b,w=.04,d=.04){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),m=add(id,new THREE.BoxGeometry(w,va.distanceTo(vb),d),va.clone().add(vb).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());return m;}
function cyl(id,r,len,pos,axis='x',color){return add(id,new THREE.CylinderGeometry(r,r,len,24),pos,axis==='x'?[0,0,Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:null,color)}
round('A',[.45,.045,1.30],[0,.234,.165],.018);round('A',[.48,.055,1.35],[0,.185,.15],.02,'#394954');
// Fine longitudinal belt grooves are explicit geometry, no external textures.
for(let x=-.216;x<=.216;x+=.012)box('A',[.001,.001,1.28],[x,.257,.165],'#53626e');
for(const side of [-1,1]){
 const x=side*.304;box('B',[.07,.018,1.32],[side*.264,.239,.165]);
 round('B',[.067,.10,1.40],[x,.18,.095],.015);
 round('C',[.025,.09,1.37],[side*.35,.18,.11],.012);
 box('C',[.065,.012,1.37],[side*.33,.23,.11]);
 round('D',[.032,.057,.29],[side*.371,.18,-.12],.015);
 for(let z=-.245;z<.02;z+=.025)box('D',[.003,.032,.004],[side*.389,.18,z],'#e0bbea');
 // H undercarriage: two longitudinal rails, centre crossbar.
 liftRails.push(beam('E',[side*.245,.048,-.68],[side*.245,.16,-.35],.043,.04));
 
 liftWheels.push(cyl('H',.045,.035,[side*.245,.048,-.68]));liftWheels.push(cyl('H',.017,.038,[side*.245,.048,-.68],'x','#b8c4ce'));
 round('H',[.09,.063,.12],[side*.28,.061,.73],.015);
 // End-facing rubber feet. In vertical storage the -Z faces become the ground contacts.
 round('G',[.12,.085,.105],[side*.245,.096,-.7775],.018);
 for(let y=.07;y<=.12;y+=.018)box('G',[.088,.005,.003],[side*.245,y,-.831],'#bf7f12');
 round('K',[.103,.12,.10],[side*.30,.185,.785],.025);
 beam('I',[side*.302,0,0],[side*.302,.84,.25],.053,.065);
 cyl('I',.055,.07,[side*.302,0,0]);cyl('I',.029,.073,[side*.302,0,0],'x','#d4dfdc');
 round('J',[.071,.066,.37],[side*.302,0,.115],.025);
}
liftCross=beam('E',[-.245,.10,-.52],[.245,.10,-.52],.04,.045);
actuator=beam('F',[0,.10,-.52],[0,.19,-.59],.045,.045);
round('K',[.58,.09,.19],[0,.235,-.60],.025);
cyl('A',.033,.46,[0,.215,.80]);
round('J',[.67,.07,.21],[0,.005,-.085],.025);
box('J',[.49,.004,.135],[0,.043,-.085],'#22333b');
// Basic interface only: fixed small display, original button row and safety key.
const screen=document.createElement('canvas');screen.width=512;screen.height=128;const cx=screen.getContext('2d');cx.fillStyle='#182b32';cx.fillRect(0,0,512,128);cx.fillStyle='#9fddd5';cx.font='52px monospace';cx.fillText('0.0   00:00',35,83);const tex=new THREE.CanvasTexture(screen);tex.colorSpace=THREE.SRGBColorSpace;
const display=new THREE.Mesh(new THREE.PlaneGeometry(.24,.06),new THREE.MeshBasicMaterial({map:tex}));display.rotation.x=-Math.PI/2;display.position.set(0,.047,-.07);display.userData.part='J';parts.J.group.add(display);pickables.push(display);
for(let i=0;i<8;i++)cyl('J',.009,.004,[-.19+i*.054,.048,-.125],'y',i===4?'#80c7b0':'#c4d2d9');
round('J',[.037,.014,.019],[0,.05,.005],.005,'#e65f54');
beam('J',[0,.04,-.165],[0,.13,-.18],.04,.025);round('J',[.16,.024,.05],[0,.13,-.18],.008);
const anchors={A:[0,.27,.45],B:[-.31,.19,.38],C:[.365,.19,.49],D:[.39,.18,-.12],E:[0,.10,-.52],F:[-.285,.12,-.53],G:[.245,.096,-.83],H:[-.245,.05,-.68],I:[-.30,.50,.15],J:[.03,.04,-.085],K:[0,.29,-.60]};
for(const l of labels){l.anchor=new THREE.Vector3(...anchors[l.id]);}
function updateVisibility(){for(const p of Object.values(parts)){p.group.visible=p.visible&&(!p.isNew||$('#newToggle').checked);document.querySelector(`.part[data-id=${p.id}] input`).checked=p.visible;}}
function select(id){selected=id;for(const p of Object.values(parts)){document.querySelector(`.part[data-id=${p.id}]`).classList.toggle('selected',p.id===id);for(const m of p.meshes){m.material.emissive.set(p.id===id?p.color:0x000000);m.material.emissiveIntensity=p.id===id?.25:0;}}$('#detail').style.display=id?'block':'none';if(id){$('#partTitle').textContent=id+' / '+parts[id].name;$('#partDesc').textContent=parts[id].desc;}}
const titles={open:['展开使用','现款基础结构 + 拟升级部件分色'],flat:['折叠平放','面板与立柱折叠位置为示意'],wall:['折叠竖放 · 靠墙','橙黄色 G 接地 · 轮子离地 · 可转到底部查看 H 架']};
function orientBeam(mesh,a,b){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.scale.y=start.distanceTo(end)/mesh.geometry.parameters.height;mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());}
function pose(){
 const a=state==='open'?slope*Math.PI/180:0;
 fold.rotation.x=state==='open'?0:Math.atan2(.84,.25);consolePivot.rotation.x=-fold.rotation.x;
 // Rear foot is the illustrative incline pivot; vertical storage faces the belt away from wall.
 root.rotation.set(state==='wall'?-Math.PI/2:a,0,state==='wall'?Math.PI:0);
 root.position.set(0,state==='wall'?.832:.0295*(1-Math.cos(a))+.73*Math.sin(a),state==='wall'?0:.73*(1-Math.cos(a))-.0295*Math.sin(a));
 root.updateMatrixWorld(true);
 const anchor=new THREE.Vector3(.245,.16,-.35),world=root.localToWorld(anchor.clone());
 const end=root.worldToLocal(new THREE.Vector3(world.x,.048,world.z-.35));
 // Ground follower provides a schematic lift frame, not a solved production linkage.
 for(let i=0;i<2;i++){const x=(i===0?-1:1)*.245;orientBeam(liftRails[i],[x,end.y,end.z],[x,.16,-.35]);liftWheels[i*2].position.set(x,end.y,end.z);liftWheels[i*2+1].position.set(x,end.y,end.z);}
 if(state!=='open'){
  for(let i=0;i<2;i++){const x=(i===0?-1:1)*.245;orientBeam(liftRails[i],[x,.048,-.68],[x,.16,-.35]);liftWheels[i*2].position.set(x,.048,-.68);liftWheels[i*2+1].position.set(x,.048,-.68);}
 }
 const rail=liftRails[0];orientBeam(liftCross,[-.245,rail.position.y,rail.position.z],[.245,rail.position.y,rail.position.z]);orientBeam(actuator,[0,rail.position.y,rail.position.z],[0,.195,-.59]);
 wall.visible=state==='wall';$('#slope').disabled=state!=='open';$('#slopeValue').textContent=(state==='open'?slope:0)+'°';
 $('#stateTitle').textContent=titles[state][0]+(state==='open'?' · '+slope+'°':'');$('#stateSubtitle').textContent='升级目标 450 × 1300 mm · 最大 15° / '+titles[state][1];
}
function setState(s){state=s;pose();for(const b of document.querySelectorAll('[data-state]'))b.classList.toggle('active',b.dataset.state===s);setView('perspective');}
$('#slope').oninput=e=>{slope=Number(e.target.value);pose()};
function setView(v){const t=state==='wall'?new THREE.Vector3(0,.81,0):new THREE.Vector3(0,state==='flat'?.15:.60,0);controls.target.copy(t);const views=state==='wall'?{perspective:[2,1.5,2.8],front:[0,.81,3.4],side:[3.1,.81,.05],under:[1.9,1.35,-3]}:{perspective:[2.2,1.7,2.6],front:[0,1.1,3.1],side:[3.2,.7,0],under:[1.8,-2,1.8]};camera.position.set(...views[v]);controls.update();for(const b of document.querySelectorAll('[data-view]'))b.classList.toggle('active',b.dataset.view===v);if(v==='under'){$('#envToggle').checked=false;env.visible=false;}else{$('#envToggle').checked=true;env.visible=true;}}
function setExplode(value){explode=value;const directions={A:[0,.18,0],B:[-.08,0,0],C:[.15,0,0],D:[.25,0,0],E:[0,-.21,0],F:[0,-.10,-.15],G:[0,-.13,-.23],H:[-.10,-.12,0],I:[0,.1,0],J:[0,.14,0],K:[0,.13,-.15]};for(const p of Object.values(parts))p.group.position.fromArray(directions[p.id]).multiplyScalar(value);$('#explodeValue').textContent=Math.round(value*100)+'%';}
for(const b of document.querySelectorAll('[data-state]'))b.onclick=()=>setState(b.dataset.state);for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>setView(b.dataset.view);
$('#all').onclick=()=>{for(const p of Object.values(parts))p.visible=true;$('#newToggle').checked=true;updateVisibility()};$('#clear').onclick=()=>select(null);$('#isolate').onclick=()=>{if(selected){for(const p of Object.values(parts))p.visible=p.id===selected;$('#newToggle').checked=true;updateVisibility()}};$('#newToggle').onchange=updateVisibility;$('#envToggle').onchange=()=>env.visible=$('#envToggle').checked;$('#explode').oninput=e=>setExplode(Number(e.target.value)/100);
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let down=null;canvas.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);canvas.addEventListener('pointerup',e=>{if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(pickables).find(h=>parts[h.object.userData.part].group.visible);select(hit?.object.userData.part||null);});
function layoutLabels(){const w=canvas.clientWidth,h=canvas.clientHeight,placed=[];for(const l of labels){const p=parts[l.id],pos=p.group.localToWorld(l.anchor.clone()),proj=pos.clone().project(camera);l.show=$('#labelToggle').checked&&p.group.visible&&proj.z<1&&proj.z>-1;l.element.style.display=l.show?'block':'none';if(!l.show)continue;let x=(proj.x*.5+.5)*w,y=(-proj.y*.5+.5)*h;const width=l.element.offsetWidth||100;x=Math.max(width/2+5,Math.min(w-width/2-5,x));y=Math.max(100,Math.min(h-90,y));for(let i=0;i<12&&placed.some(a=>Math.abs(a.x-x)<(width+a.width)/2+6&&Math.abs(a.y-y)<28);i++)y+=29;if(y>h-65)y=h-65;placed.push({x,y,width});l.x=x;l.y=y;l.element.style.left=x+'px';l.element.style.top=y+'px';}}
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}new ResizeObserver(resize).observe(canvas);setState('open');resize();
function frame(){requestAnimationFrame(frame);controls.update();renderer.render(scene,camera);layoutLabels()}frame();
$('#export').onclick=()=>{renderer.render(scene,camera);layoutLabels();const out=document.createElement('canvas'),w=1440,h=1000;out.width=w;out.height=h;const c=out.getContext('2d');c.fillStyle='#eef1f4';c.fillRect(0,0,w,h);const target={x:0,y:80,w:1120,h:840},ratio=Math.min(target.w/canvas.width,target.h/canvas.height),dw=canvas.width*ratio,dh=canvas.height*ratio,ox=(target.w-dw)/2,oy=80+(840-dh)/2;c.drawImage(canvas,ox,oy,dw,dh);c.fillStyle='#182632';c.font='bold 25px sans-serif';c.fillText('雪影 Z7PRO · '+titles[state][0]+(state==='open'?' · '+slope+'°':''),30,40);c.font='14px sans-serif';c.fillStyle='#60717c';c.fillText('部件讨论模型 v0.2 / 分色不代表最终 CMF'+(explode?' / 拆开查看 '+Math.round(explode*100)+'%':''),30,65);for(const l of labels){if(!l.show)continue;const x=ox+l.x/canvas.clientWidth*dw,y=oy+l.y/canvas.clientHeight*dh;c.font='bold 16px sans-serif';c.fillStyle='#fff';c.fillRect(x-12,y-12,25,25);c.strokeStyle=parts[l.id].color;c.lineWidth=3;c.strokeRect(x-12,y-12,25,25);c.fillStyle='#182632';c.fillText(l.id,x-6,y+6)}c.fillStyle='#fff';c.fillRect(1120,80,320,840);c.font='bold 17px sans-serif';c.fillStyle='#182632';c.fillText('部件编号',1145,115);let y=155;for(const p of Object.values(parts)){c.globalAlpha=p.group.visible?1:.35;c.fillStyle=p.color;c.fillRect(1145,y-14,15,15);c.font=selected===p.id?'bold 15px sans-serif':'15px sans-serif';c.fillStyle='#182632';c.fillText(p.id+'  '+p.name,1171,y);y+=44}c.globalAlpha=1;c.font='14px sans-serif';c.fillStyle='#60717c';c.fillText('橙黄色 G：拟新增竖放防滑支撑',1145,710);c.fillText('紫色 D：拟新增弹性外挂件',1145,740);c.fillText('青色 C：拟新增侧框包边',1145,770);c.fillText('升级目标：有效跑带 450 × 1300 mm / 最大爬坡 15° / 整机尺寸待定',30,947);c.fillText('近似模型；隐藏结构、局部尺寸及折叠轨迹为示意。支撑方案未经工程与稳定性验证。',30,973);const a=document.createElement('a');a.download=`Z7PRO-${state}-${selected||'all'}-${Date.now()}.png`;a.href=out.toDataURL('image/png');a.click();};
// Simple geometry checks: storage pads are lower than the wheels, and critical pairs exist.
console.assert(parts.G.meshes.length>=2&&parts.D.meshes.length>=2,'Missing paired upgrade parts');
console.assert(-.7775-.105/2<-.68-.045,'Vertical feet must extend beyond the wheels');
window.modelReview={pose,parts,setState,setView,setExplode,select,renderer,scene,camera};
