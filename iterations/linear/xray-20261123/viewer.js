import * as T from 'three';
import {OrbitControls} from '../motion-20261123/OrbitControls.js';
const $=id=>document.getElementById(id), scene=new T.Scene();scene.background=new T.Color('#e8edf0');
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(1);document.body.append(renderer.domElement);
const camera=new T.PerspectiveCamera(34,1,.01,30),controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=false;scene.add(new T.HemisphereLight(0xffffff,0x6c8491,2));
const light=new T.DirectionalLight(0xffffff,2);light.position.set(-3,5,4);scene.add(light);
const material=new T.MeshLambertMaterial({color:0x557f94,transparent:true,opacity:.22,depthWrite:false,side:T.FrontSide});
let mesh,box,manifest,busy=false,key,frames=0;
function render(){renderer.render(scene,camera);frames++;}
controls.addEventListener('change',render);
function fit(){if(!box)return;const center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());controls.target.copy(center);const distance=size.length()/(2*Math.sin(camera.fov*Math.PI/360))*1.12;camera.position.copy(center).addScaledVector(new T.Vector3(-1,.65,-1).normalize(),distance);camera.up.set(0,1,0);camera.lookAt(center);controls.update();render();}
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();render();}window.addEventListener('resize',resize);resize();
function mode(x){material.transparent=x;material.opacity=x?.22:1;material.depthWrite=!x;material.needsUpdate=true;$('xray').setAttribute('aria-pressed',x);$('solid').setAttribute('aria-pressed',!x);render();}
$('xray').onclick=()=>mode(true);$('solid').onclick=()=>mode(false);$('reset').onclick=fit;
async function load(value){if(busy)return;busy=true;$('loading').hidden=false;
try{manifest??=await (await fetch('models.json',{cache:'no-store'})).json();const info=manifest[value],response=await fetch(value+'.gz');if(!response.ok)throw Error('网格加载失败');const bytes=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
if(mesh){scene.remove(mesh);mesh.geometry.dispose();}
const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(new Float32Array(bytes,0,info.vertices*3),3));geometry.setIndex(new T.BufferAttribute(new Uint32Array(bytes,info.indexOffset,info.indices),1));geometry.computeVertexNormals();mesh=new T.Mesh(geometry,material);scene.add(mesh);box=new T.Box3().setFromObject(mesh);key=value;fit();for(const b of document.querySelectorAll('[data-model]'))b.setAttribute('aria-pressed',b.dataset.model===key);$('status').textContent=`${(info.triangles/10000).toFixed(1)} 万三角面 · 单次绘制${info.missingFaces?' · '+info.missingFaces+' 个面未能显示':''}`;history.replaceState(null,'','#'+value);$('loading').hidden=true;window.review={renderer,camera,scene,mesh,info,get frames(){return frames;},render,fit};document.documentElement.dataset.ready=value;
}catch(e){$('loading').textContent=e.message;}finally{busy=false;}}
for(const b of document.querySelectorAll('[data-model]'))b.onclick=()=>load(b.dataset.model);
load('short');
