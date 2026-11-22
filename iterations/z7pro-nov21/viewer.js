import * as T from 'three';
import {OrbitControls} from '../../vendor/OrbitControls.js';

const $=id=>document.getElementById(id);
const revision=document.querySelector('meta[name="model-revision"]').content;
async function resource(name){
  const r=await fetch(`${name}?v=${revision.slice(0,12)}`);
  if(!r.ok)throw new Error(`${name} 加载失败 (${r.status})`);
  return r;
}

async function main(){
  const meta=await (await resource('meta.json')).json();
  if(meta.sourceSha256!==revision)throw new Error('模型版本不一致，请刷新页面。');
  const packed=await resource('mesh.gz');
  const bytes=await new Response(packed.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const scene=new T.Scene();scene.background=new T.Color('#edf0f2');
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  $('viewport').append(renderer.domElement);
  const camera=new T.PerspectiveCamera(32,1,.005,50);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.minDistance=.035;controls.maxDistance=15;
  scene.add(new T.HemisphereLight(0xffffff,0x80909d,1.6));
  for(const [p,power] of [[[-2,4,-3],2.2],[[3,2,2],.9]]){
    const light=new T.DirectionalLight(0xffffff,power);light.position.set(...p);scene.add(light);
  }
  const material=new T.MeshStandardMaterial({color:0x8a959d,roughness:.62,metalness:.12,side:T.DoubleSide});
  const lineMaterial=new T.LineBasicMaterial({color:0x44545d,transparent:true,opacity:.24});
  const model=new T.Group();scene.add(model);const meshes=[],outlines=[];
  for(const p of meta.parts){
    if(p.vertexOffset%4||p.indexOffset%4||p.vertexOffset+p.vertexCount*12>bytes.byteLength||p.indexOffset+p.indexCount*4>bytes.byteLength)throw new Error('模型数据不完整。');
    const g=new T.BufferGeometry();
    g.setAttribute('position',new T.BufferAttribute(new Float32Array(bytes,p.vertexOffset,p.vertexCount*3),3));
    g.setIndex(new T.BufferAttribute(new Uint32Array(bytes,p.indexOffset,p.indexCount),1));g.computeVertexNormals();
    const mesh=new T.Mesh(g,material);mesh.name=`零件 ${String(p.id).padStart(3,'0')}`;model.add(mesh);meshes.push(mesh);
    const line=new T.LineSegments(new T.EdgesGeometry(g,35),lineMaterial);mesh.add(line);outlines.push(line);
    if(p.mirror){const opposite=mesh.clone();opposite.scale.z=-1;opposite.name+=' · 对侧';model.add(opposite);meshes.push(opposite);outlines.push(opposite.children[0]);}
  }
  model.updateMatrixWorld(true);
  const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());
  if(box.isEmpty()||!Number.isFinite(size.length()))throw new Error('模型范围无效。');
  let view='front45';
  const directions={front45:[-1,.55,-1],rear45:[1,.6,1],side:[0,.02,-1],front:[-1,.02,0],top:[0,1,.0001],bottom:[0,-1,.0001]};
  function fit(targetBox=box){
    const s=targetBox.getSize(new T.Vector3()),center=targetBox.getCenter(new T.Vector3());
    const direction=new T.Vector3(...directions[view]).normalize();
    camera.up.set(...(['top','bottom'].includes(view)?[0,0,-1]:[0,1,0]));
    let distance=Math.max(s.y,s.x/camera.aspect,s.z)*.65/Math.tan(camera.fov*Math.PI/360)+Math.max(s.x,s.z)*.55;
    for(let n=0;n<18;n++){
      camera.position.copy(center).addScaledVector(direction,distance);camera.lookAt(center);camera.updateMatrixWorld();
      let extent=0;
      for(const x of [targetBox.min.x,targetBox.max.x])for(const y of [targetBox.min.y,targetBox.max.y])for(const z of [targetBox.min.z,targetBox.max.z]){
        const p=new T.Vector3(x,y,z).project(camera);extent=Math.max(extent,Math.abs(p.x),Math.abs(p.y));
      }
      if(extent<.84)break;distance*=1.18;
    }
    controls.target.copy(center);controls.update();renderer.render(scene,camera);
  }
  function setView(value){
    view=value;for(const b of document.querySelectorAll('[data-view]'))b.setAttribute('aria-pressed',String(b.dataset.view===view));fit();
  }
  for(const b of document.querySelectorAll('[data-view]'))b.onclick=()=>setView(b.dataset.view);
  $('edges').onchange=e=>{for(const line of outlines)line.visible=e.target.checked;};
  $('transparent').onchange=e=>{material.transparent=e.target.checked;material.opacity=e.target.checked?.24:1;material.depthWrite=!e.target.checked;material.needsUpdate=true;};
  $('reset').onclick=()=>{
    $('transparent').checked=false;$('transparent').dispatchEvent(new Event('change'));
    $('edges').checked=true;$('edges').dispatchEvent(new Event('change'));$('part').textContent='双击零件可近看';setView('front45');
  };
  renderer.domElement.addEventListener('dblclick',e=>{
    const r=renderer.domElement.getBoundingClientRect(),pointer=new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
    const ray=new T.Raycaster();ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(meshes,false)[0];
    if(hit){$('part').textContent=hit.object.name+' · 点击复位返回整机';fit(new T.Box3().setFromObject(hit.object));}
  });
  function resize(){
    const r=$('viewport').getBoundingClientRect();renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();fit();
  }
  new ResizeObserver(resize).observe($('viewport'));resize();
  renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
  window.modelReview={revision,sourceInstances:meta.sourceOccurrences||meta.occurrences||meta.parts.length,displayInstances:meshes.length,scene,camera,renderer,model,setView,fit};
  $('loading').hidden=true;document.documentElement.dataset.modelReady='true';
}

main().catch(e=>{
  $('message').textContent='模型暂时无法加载';$('error').hidden=false;$('error').textContent=e.message;$('retry').hidden=false;$('retry').onclick=()=>location.reload();
  document.documentElement.dataset.modelReady='error';console.error(e);
});
