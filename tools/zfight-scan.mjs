import { JSDOM } from 'jsdom';
const dom=new JSDOM(`<!DOCTYPE html><html><body><canvas id="scene"></canvas><div id="ui-root"></div></body></html>`,{pretendToBeVisual:true,url:'http://localhost:5173/'});
const {window}=dom;
const c2=new Proxy({canvas:null,fillStyle:'',strokeStyle:'',lineWidth:1,font:'',textAlign:'',textBaseline:'',lineCap:'',letterSpacing:'',globalAlpha:1,globalCompositeOperation:'',filter:''},
 {get(t,k){if(k in t)return t[k]; if(k==='measureText')return()=>({width:10});
  if(k==='getImageData')return(x,y,w,h)=>({data:new Uint8ClampedArray(w*h*4),width:w,height:h});
  if(k==='createLinearGradient'||k==='createRadialGradient')return()=>({addColorStop(){}}); return()=>{};},
  set(t,k,v){t[k]=v;return true;}});
window.HTMLCanvasElement.prototype.getContext=(k)=>k==='2d'?c2:null;
window.HTMLElement.prototype.getBoundingClientRect=()=>({width:400,height:500,top:0,left:0,right:400,bottom:500});
window.matchMedia=(q)=>({matches:false,media:q,addEventListener(){},removeEventListener(){}});
for(const k of ['window','document','navigator','requestAnimationFrame','cancelAnimationFrame','HTMLCanvasElement','Image','localStorage','getComputedStyle','Element','Node','CustomEvent','KeyboardEvent','PointerEvent','MouseEvent','devicePixelRatio'])
 {try{Object.defineProperty(globalThis,k,{value:window[k],configurable:true,writable:true});}catch{}}
globalThis.self=window;
let running=true; globalThis.requestAnimationFrame=(fn)=>running?setTimeout(()=>fn(Date.now()),1):0;
await import('./app/src/main.js');
let w=0; while(!window.AI&&w<9000){await new Promise(r=>setTimeout(r,50));w+=50;}
const AI=window.AI; running=false;
const T=await import('three');

AI.engine.scene.updateMatrixWorld(true);
const faces=[];
AI.engine.scene.traverse(o=>{
  if(!o.isMesh||!o.geometry?.attributes?.position) return;
  if(o.material?.colorWrite===false) return;               // the invisible ceilings
  if(o.material?.transparent && o.material?.opacity<0.5) return;
  const bb=new T.Box3().setFromObject(o);
  const size=new T.Vector3(); bb.getSize(size);
  const thin=size.x<size.y&&size.x<size.z?0:(size.y<size.z?1:2);
  const t=[size.x,size.y,size.z][thin];
  if(t>0.35) return;                                       // not a flat plate
  const c=new T.Vector3(); bb.getCenter(c);
  faces.push({o,bb,thin,plane:[c.x,c.y,c.z][thin],
    name:o.geometry.type+'/'+(o.material?.name||o.material?.color?.getHexString()||'')});
});

const overlap=(a,b,ax)=>{
  const k=['x','y','z'][ax];
  return a.bb.min[k] < b.bb.max[k]-0.05 && a.bb.max[k] > b.bb.min[k]+0.05;
};
const clashes=[];
for(let i=0;i<faces.length;i++) for(let j=i+1;j<faces.length;j++){
  const a=faces[i],b=faces[j];
  if(a.thin!==b.thin) continue;
  const d=Math.abs(a.plane-b.plane);
  if(d>0.035) continue;                                    // far enough apart
  const others=[0,1,2].filter(k=>k!==a.thin);
  if(!overlap(a,b,others[0])||!overlap(a,b,others[1])) continue;
  clashes.push({d,axis:'xyz'[a.thin],plane:a.plane,a:a.name,b:b.name,
    at:`${a.bb.min.x.toFixed(1)}..${a.bb.max.x.toFixed(1)} , ${a.bb.min.z.toFixed(1)}..${a.bb.max.z.toFixed(1)}`});
}
clashes.sort((p,q)=>p.d-q.d);
console.log(`${faces.length} flat surfaces checked, ${clashes.length} co-planar overlaps found\n`);
for(const c of clashes.slice(0,14))
  console.log(`  gap ${c.d.toFixed(4)} on ${c.axis}=${c.plane.toFixed(3)}  [${c.at}]  ${c.a}  vs  ${c.b}`);
