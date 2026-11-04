/* Concept side-view only: assumed lengths and two transverse axes, not CAD or a collision certificate. */
(function () {
  const rad = a => a * Math.PI / 180;
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const rotate = (p, a) => [p[0] * Math.cos(rad(a)) - p[1] * Math.sin(rad(a)), p[0] * Math.sin(rad(a)) + p[1] * Math.cos(rad(a))];
  const A = [0, 230], postLength = 960, armLength = 340, openAngle = 75;
  function pose(progress) {
    const t = Math.max(0, Math.min(100, progress));
    const theta = t <= 35 ? openAngle : openAngle * (100 - t) / 65;
    const phi = t <= 35 ? openAngle * t / 35 : theta;
    const B = add(A, rotate([postLength, 0], theta));
    return { A, B, C: add(B, rotate([armLength, 0], phi)), theta, phi };
  }
  function svgFor(mode, value, family = 'lynmate') {
    const q = pose(mode === 'fold' ? value : mode === 'store' ? 100 : 0);
    const tilt = mode === 'slope' ? Math.max(0, Math.min(15, value)) : 0;
    const standing = mode === 'store';
    const body = p => standing ? add(rotate(p, 90), [0, 65]) : add(rotate([p[0] - 1450, p[1] - 170], -tilt), [1450, 170]);
    // Same x/y scale is necessary for honest angle depiction.
    const project = p => [(standing ? 560 : 150) + p[0] * .38, 650 - p[1] * .38];
    const xy = p => project(body(p)).map(n => n.toFixed(2)).join(',');
    const worldxy = p => project(p).map(n => n.toFixed(2)).join(',');
    const fixed = '#434e4a', moving = family === 'lynmate' ? '#b49b86' : '#9ba6ae', upper = '#587d72';
    const stage = value===0?'01 · 展开锁定':value<=35?'02 · 上部组件翻转':value<100?'03 · 立柱绕下轴落下':'04 · 折平，固定下梁与活动框分成两层';
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 720" role="img" aria-label="${family === 'lynmate' ? '灵伴' : '凌序'}${mode === 'fold' ? '收折' : mode === 'slope' ? '爬坡' : '竖放'}侧视动作示意"><rect width="1000" height="720" fill="#fbfaf7"/><g font-family="sans-serif" fill="#3c4741"><text x="35" y="40" font-size="19">${mode === 'fold' ? stage : mode === 'slope' ? '跑台前端抬升 · 单杆 H 架侧投影' : '先折平，再整机竖起 · 跑面朝墙'}</text><path d="M50 651 H950" stroke="#c9cdc7"/>`;
    const poly = (points, color, width) => `<polyline points="${points.map(xy).join(' ')}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
    const shape = (points, color) => `<polygon points="${points.map(xy).join(' ')}" fill="${color}"/>`;
    const circ = (p, radius, color) => { const [x,y] = xy(p).split(','); return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" stroke="#fff" stroke-width="2"/>`; };
    const label = (p, name, dx = 15, dy = -14) => {const [x,y]=project(body(p));return `<text x="${x+dx}" y="${y+dy}" font-size="20" font-weight="700">${name}</text>`;};
    if (standing) s += `<path d="M442 58 V651" stroke="#d8d8d1" stroke-width="12"/><text x="350" y="360" font-size="20">墙</text><text x="292" y="401" font-size="16">跑面朝墙 ←</text><text x="600" y="401" font-size="16">→ 机底朝房间</text>`;
    if (tilt > 0) {
      const near = body([450, 90]), rear = body([920, 80]);
      s += `<polyline points="${worldxy(near)} ${worldxy([230,32])} ${worldxy([730,32])} ${worldxy(rear)}" fill="none" stroke="#434e4a" stroke-width="13" stroke-linejoin="round"/><path d="M${worldxy([450,40])} L${worldxy(body([680,85]))}" stroke="#80948d" stroke-width="12"/>`;
      for (const p of [[230,32],[730,32]]) {const [x,y]=project(p);s+=`<circle cx="${x}" cy="${y}" r="10" fill="#303a35"/>`;}
      const anchor=project([1450,170]);s+=`<path d="M${anchor[0]-180},${anchor[1]} H${anchor[0]}" stroke="#a1aaa3" stroke-dasharray="6 5"/><text x="${anchor[0]-200}" y="${anchor[1]-35}" font-size="21">${tilt}°</text>`;
    } else s += poly([[250,60],[820,60]], '#6c7770', 9);
    s += shape([[0,65],[430,65],[430,145],[0,145]], '#68736d');
    s += shape([[0,105],[1500,105],[1500,170],[0,170]], fixed);
    s += poly([[20,176],[1470,176]], '#1e2522', 4);
    s += shape([[-65,25],[-45,25],[-45,165],[-65,165]], '#242e29');
    s += poly([[-45,110],[20,110]], fixed, 11);
    s += circ([-15,40], 15.2, '#222e27');
    if (!standing) s += shape([[1410,0],[1490,0],[1490,65],[1410,65]], '#303a35');
    s += poly([q.A,q.B], moving, family === 'lynmate' ? 29 : 18);
    s += poly([q.B,q.C], upper, family === 'lynmate' ? 21 : 14);
    const panel = [[-100,0],[30,0],[30,38],[-100,38]].map(p => add(q.B, rotate(p,q.phi)));
    s += shape(panel, '#344c43');
    s += circ(q.A, 10, '#b2774b') + circ(q.B, 9, '#587d72') + label(q.A,'A') + label(q.B,'B');
    if (mode === 'fold' && value > 0 && value < 100) s += poly([A,add(A,rotate([960,0],75))], '#b49b8630', 9);
    s += `<text x="35" y="695" font-size="14" fill="#737d75">比例与轴位为概念假设；此图解释动作顺序，不证明锁止、空间包络、承载与稳定性。</text></g></svg>`;
    return s;
  }
  if (typeof module !== 'undefined') module.exports = {pose, svgFor, rotate};
  if (typeof document === 'undefined') return;
  const area=document.getElementById('motion-view'), range=document.getElementById('motion-range'), readout=document.getElementById('motion-readout');
  let mode='fold', family='lynmate';
  function render() {
    const v=Number(range.value); area.innerHTML=svgFor(mode,v,family);
    readout.textContent=mode==='slope' ? `爬坡目标 ${v}°` : mode==='store' ? '折平后竖放 · 支撑示意' : v===0 ? '展开锁定' : v<=35 ? '① 上部扶手／面板组件翻转' : v<100 ? '② 立柱绕下轴向跑台落下' : '折平 · 固定下梁与活动立柱分成上下两层';
    range.setAttribute('aria-valuetext',readout.textContent);
  }
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.mode;range.max=mode==='slope'?15:100;range.disabled=mode==='store';range.value=mode==='slope'?15:mode==='store'?100:0;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();}));
  document.querySelectorAll('[data-progress]').forEach(button=>button.addEventListener('click',()=>{mode='fold';range.max=100;range.disabled=false;range.value=button.dataset.progress;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode==='fold')));render();}));
  document.getElementById('motion-family').addEventListener('change',event=>{family=event.target.value;render();});
  range.addEventListener('input',render);render();
})();
