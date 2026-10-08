import * as THREE from 'three';

// Female mosquito artistic reconstructions; dimensions are normalized, not millimetres.
// All detail is ordinary glTF-compatible mesh geometry and PBR materials.
export const SPECIES = Object.freeze({
  AEDES_AEGYPTI: 'aedes-aegypti', AEDES_ALBOPICTUS: 'aedes-albopictus',
  ANOPHELES_ARABIENSIS: 'anopheles-arabiensis', ANOPHELES_GAMBIAE: 'anopheles-gambiae',
  CULEX_PIPIENS: 'culex-pipiens', CULEX_QUINQUEFASCIATUS: 'culex-quinquefasciatus',
});
const PROFILES = {
  'aedes-aegypti': {label:'Aedes aegypti', genus:'aedes', thorax:0x211e19, cuticle:0x211712, pale:0xe9e4d1, eye:0x252821, lyre:true, length:1.74, radius:.165},
  'aedes-albopictus': {label:'Aedes albopictus', genus:'aedes', thorax:0x111416, cuticle:0x171619, pale:0xf4efe2, eye:0x19201e, stripe:true, length:1.82, radius:.152},
  'anopheles-arabiensis': {label:'Anopheles arabiensis', genus:'anopheles', thorax:0x5b4830, cuticle:0x493323, pale:0xb7a477, eye:0x22291b, length:1.98, radius:.142},
  'anopheles-gambiae': {label:'Anopheles gambiae', genus:'anopheles', thorax:0x4d3e32, cuticle:0x45322c, pale:0xc4b49b, eye:0x26241c, length:2.02, radius:.151},
  'culex-pipiens': {label:'Culex pipiens', genus:'culex', thorax:0x77502a, cuticle:0x624324, pale:0xd3b778, eye:0x193027, length:1.84, radius:.174},
  'culex-quinquefasciatus': {label:'Culex quinquefasciatus', genus:'culex', thorax:0x6b4e31, cuticle:0x543a25, pale:0xc6aa75, eye:0x202f22, length:1.90, radius:.167},
};
const TAU = Math.PI * 2;
const vec = (x,y,z) => new THREE.Vector3(x,y,z);
function rng(seed) {
  let n = [...seed].reduce((s,c) => (s*31+c.charCodeAt(0)) >>> 0, 18371);
  return () => { n ^= n<<13; n ^= n>>>17; n ^= n<<5; return (n>>>0)/4294967296; };
}
function mesh(geometry, material, name) {
  const m = new THREE.Mesh(geometry, material); m.name=name; m.castShadow=true; m.receiveShadow=true; return m;
}
function pbr(color, roughness=.55, extra={}) {
  return new THREE.MeshPhysicalMaterial({color, roughness, metalness:0, clearcoat:.08, clearcoatRoughness:.5, ...extra});
}

// Batched triangles: thousands of scales, eye lenses and bristles use a few draw calls.
class DetailBatch {
  constructor() { this.p=[]; this.c=[]; }
  triangle(a,b,c,color) {
    for(const v of [a,b,c]) { this.p.push(v.x,v.y,v.z); this.c.push(color.r,color.g,color.b); }
  }
  scale(p,n,t,length,width,color,lift=.0015) {
    t=t.clone().addScaledVector(n,-t.dot(n)).normalize();
    const b=new THREE.Vector3().crossVectors(n,t).normalize();
    const tail=p.clone().addScaledVector(t,-length*.45);
    const l=p.clone().addScaledVector(t,length*.18).addScaledVector(b,width);
    const tip=p.clone().addScaledVector(t,length*.55);
    const r=p.clone().addScaledVector(t,length*.18).addScaledVector(b,-width);
    const peak=p.clone().addScaledVector(n,lift);
    this.triangle(tail,r,peak,color); this.triangle(r,tip,peak,color);
    this.triangle(tip,l,peak,color); this.triangle(l,tail,peak,color);
  }
  bristle(a,b,r,color,sides=4) {
    const d=b.clone().sub(a).normalize();
    const tangent=new THREE.Vector3().crossVectors(d,Math.abs(d.y)<.9?vec(0,1,0):vec(1,0,0)).normalize();
    const binormal=new THREE.Vector3().crossVectors(d,tangent);
    for(let i=0;i<sides;i++) {
      const u=i/sides*TAU,v=(i+1)/sides*TAU;
      const p=a.clone().addScaledVector(tangent,Math.cos(u)*r).addScaledVector(binormal,Math.sin(u)*r);
      const q=a.clone().addScaledVector(tangent,Math.cos(v)*r).addScaledVector(binormal,Math.sin(v)*r);
      this.triangle(p,q,b,color);
    }
  }
  build(material,name) {
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3)); g.computeVertexNormals(); g.computeBoundingSphere();
    return mesh(g,material,name);
  }
}

function tube(parent,points,radius,material,name,radial=7) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>p.isVector3?p:vec(...p)));
  const m=mesh(new THREE.TubeGeometry(curve,Math.max(3,points.length*5),radius,radial,false),material,name);
  parent.add(m); return m;
}
function rod(parent,a,b,r1,r2,mat,name) {
  const dir=b.clone().sub(a);
  const m=mesh(new THREE.CylinderGeometry(r2,r1,dir.length(),8,1),mat,name);
  m.position.copy(a).add(b).multiplyScalar(.5);
  m.quaternion.setFromUnitVectors(vec(0,1,0),dir.normalize()); parent.add(m); return m;
}
function ellipsoid(parent,center,size,mat,name) {
  const m=mesh(new THREE.SphereGeometry(1,36,24),mat,name);
  m.position.copy(center); m.scale.set(...size); parent.add(m); return m;
}

// A custom surface shares its parameterization with its texture and scale placement.
function surfaceGeometry(sample, nx=100, na=80) {
  const pos=[],uv=[],idx=[];
  for(let i=0;i<=nx;i++) for(let j=0;j<=na;j++) {
    const p=sample(i/nx,j/na*TAU); pos.push(p.x,p.y,p.z); uv.push(j/na,1-i/nx);
  }
  for(let i=0;i<nx;i++) for(let j=0;j<na;j++) {
    const a=i*(na+1)+j,b=a+na+1;
    idx.push(a,a+1,b,b,a+1,b+1);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();
  const normals=g.attributes.normal;
  for(let i=0;i<=nx;i++)for(let j=0;j<=na;j++) {
    const k=i*(na+1)+j;
    if(i===0)normals.setXYZ(k,-1,0,0);
    else if(i===nx)normals.setXYZ(k,1,0,0);
    else if(normals.getX(k)**2+normals.getY(k)**2+normals.getZ(k)**2<.5){
      const n=surfaceNormal(sample,i/nx,j/na*TAU);normals.setXYZ(k,n.x,n.y,n.z);
    }
  }
  g.normalizeNormals();return g;
}
function surfaceNormal(sample,t,a) {
  const d=sample(Math.min(.9999,t+.0001),a).sub(sample(Math.max(.0001,t-.0001),a));
  const e=sample(t,a+.001).sub(sample(t,a-.001));
  return new THREE.Vector3().crossVectors(e,d).normalize();
}
function thoraxPoint(t,a) {
  const x=(t-.5)*.94;
  const r=Math.pow(Math.max(0,Math.sin(Math.PI*t)),.62);
  const y=.31*r*Math.cos(a)+.035*Math.sin(Math.PI*t);
  return vec(x,y,.275*r*Math.sin(a)*(1-.10*Math.cos(Math.PI*t)));
}
function marking(d,t,a,part) {
  const top=Math.cos(a), side=Math.abs(Math.sin(a));
  if(part==='thorax') {
    const z=Math.abs(Math.sin(a)*.275);
    if(d.stripe) return top>.65&&z<.025&&t>.12&&t<.89;
    if(d.lyre) {
      const target=.095+.105*Math.sin(Math.PI*Math.min(1,t*1.13));
      return top>.36&&t>.13&&t<.91&&(Math.abs(z-target)<.013 || (t>.36&&t<.80&&Math.abs(z-.048)<.009));
    }
    return top>.55&&Math.abs(Math.sin(a*3))<.10&&t>.15&&t<.9;
  }
  const cycle=t*8, local=cycle-Math.floor(cycle);
  if(d.genus==='aedes') return t>.13&&t<.92&&((local<.19&&top>.1)||(side>.90&&local<.45));
  if(d.genus==='culex') return t>.13&&local<.22;
  return side>.86&&local<.10;
}
function surfaceTextures(d,part,random) {
  const w=512,h=1024;
  const base=document.createElement('canvas'), normal=document.createElement('canvas'), rough=document.createElement('canvas');
  for(const c of [base,normal,rough]) {c.width=w;c.height=h;}
  const ctx=base.getContext('2d'),nctx=normal.getContext('2d'),rctx=rough.getContext('2d');
  const pixels=ctx.createImageData(w,h),norm=nctx.createImageData(w,h),rgh=rctx.createImageData(w,h);
  const dark=new THREE.Color(part==='thorax'?d.thorax:d.cuticle).convertLinearToSRGB();
  const light=new THREE.Color(d.pale).convertLinearToSRGB();
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
    const t=y/(h-1),a=x/w*TAU,k=(y*w+x)*4;
    const isPale=marking(d,t,a,part),c=isPale?light:dark;
    const grain=.66+random()*.57;
    const seam=part==='abdomen'?.72+.28*Math.pow(Math.sin(t*8*Math.PI),2):1;
    pixels.data[k]=Math.min(255,c.r*255*grain*seam);pixels.data[k+1]=Math.min(255,c.g*255*grain*seam);pixels.data[k+2]=Math.min(255,c.b*255*grain*seam);pixels.data[k+3]=255;
    const ridge=Math.sin(x*.77+(y%11)*.27)*12;
    norm.data[k]=128+ridge;norm.data[k+1]=128+Math.cos(y*.59+x*.07)*10;norm.data[k+2]=253;norm.data[k+3]=255;
    const rv=150+random()*80;rgh.data[k]=rgh.data[k+1]=rgh.data[k+2]=rv;rgh.data[k+3]=255;
  }
  ctx.putImageData(pixels,0,0);nctx.putImageData(norm,0,0);rctx.putImageData(rgh,0,0);
  const map=new THREE.CanvasTexture(base);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  const normalMap=new THREE.CanvasTexture(normal),roughnessMap=new THREE.CanvasTexture(rough);
  return {map,normalMap,normalScale:new THREE.Vector2(.45,.45),roughnessMap};
}
function groom(parent,sample,d,part,random,high) {
  const scales=new DetailBatch(),hairs=new DetailBatch();
  const base=new THREE.Color(part==='thorax'?d.thorax:d.cuticle),pale=new THREE.Color(d.pale);
  const count=high?(part==='thorax'?6300:6800):1400;
  for(let i=0;i<count;i++) {
    const t=.055+random()*.89,a=random()*TAU,p=sample(t,a),n=surfaceNormal(sample,t,a);
    const white=marking(d,t,a,part);
    const c=(white?pale:base).clone().multiplyScalar(.60+random()*1.1);
    if(!white&&random()<.12)c.lerp(pale,.19);
    const length=(part==='thorax'?.017:.020)*(.65+random()*.7);
    scales.scale(p.addScaledVector(n,.001),n,vec(1,random()*.1,random()*.1),length,length*.20,c,.0019);
    if(i%(high?23:13)===0) {
      const end=p.clone().addScaledVector(n,.033+random()*.083).addScaledVector(vec(1,0,0),.025);
      hairs.bristle(p,end,.0012+random()*.0007,new THREE.Color(d.pale).multiplyScalar(.19+random()*.27));
    }
  }
  parent.add(scales.build(pbr(0xffffff,.49,{vertexColors:true,side:THREE.DoubleSide}),`${part}_overlapping_scales`));
  parent.add(hairs.build(pbr(0xffffff,.72,{vertexColors:true}),`${part}_setae`));
}
function abdomenPoint(d,t,a) {
  const shape=Math.pow(Math.sin(Math.PI*t),.44)*(1-.28*t);
  const segment=1-.052*Math.pow(.5+.5*Math.cos(t*8*TAU),8);
  const r=d.radius*shape*segment;
  return vec(t*d.length,-.045*t+r*.91*Math.cos(a),r*Math.sin(a));
}

function eye(parent,side,d,high,random) {
  const center=vec(-.085,.008,side*.091),rx=.131,ry=.142,rz=.112;
  ellipsoid(parent,center,[rx,ry,rz],pbr(d.eye,.36),`Eye_${side}_core`);
  const batch=new DetailBatch();
  const rows=high?44:23;
  for(let row=1;row<rows;row++) {
    const lat=row/rows*Math.PI, ring=Math.max(5,Math.round(Math.sin(lat)*rows*2));
    for(let col=0;col<ring;col++) {
      const a=(col+(row%2)*.5)/ring*TAU;
      const n=vec(Math.sin(lat)*Math.cos(a),Math.cos(lat),Math.sin(lat)*Math.sin(a));
      const p=center.clone().add(vec(n.x*rx,n.y*ry,n.z*rz));
      const normal=vec(n.x/rx,n.y/ry,n.z/rz).normalize();
      const tan=new THREE.Vector3().crossVectors(normal,vec(0,1,0)).normalize();
      const bin=new THREE.Vector3().crossVectors(normal,tan);
      const r=.127*Math.PI/rows*.53;
      const c=new THREE.Color(d.eye).multiplyScalar(.65+random()*.8);
      c.lerp(new THREE.Color(0x737849),random()*.18);
      const apex=p.clone().addScaledVector(normal,.0018);
      for(let k=0;k<6;k++) {
        const aa=k/6*TAU,bb=(k+1)/6*TAU;
        const v=p.clone().addScaledVector(tan,Math.cos(aa)*r).addScaledVector(bin,Math.sin(aa)*r*.96);
        const w=p.clone().addScaledVector(tan,Math.cos(bb)*r).addScaledVector(bin,Math.sin(bb)*r*.96);
        batch.triangle(apex,v,w,c);
      }
    }
  }
  parent.add(batch.build(pbr(0xffffff,.31,{vertexColors:true,clearcoat:.34,clearcoatRoughness:.26,iridescence:.13}),`Eye_${side}_hexagonal_lenses`));
}

function leg(parent,side,index,d,mat,random,high) {
  const group=new THREE.Group();group.name=`Leg_${side>0?'L':'R'}_${index}`;parent.add(group);
  const hips=[[-.24,-.14,.20],[-.03,-.16,.25],[.19,-.13,.22]];
  // Raised knees and splayed tibiae reproduce the fine angular silhouette in the references.
  const knees=[[-.98,.22,.76],[.02,.53,1.10],[.91,.56,1.02]];
  const ankles=[[-1.51,-.97,1.13],[.09,-1.01,1.66],[1.80,-1.00,1.70]];
  const ends=[[-2.13,-1.08,1.60],[.38,-1.10,2.25],[2.76,-1.08,2.12]];
  const mirror=p=>vec(p[0],p[1],p[2]*side);
  const hip=mirror(hips[index]),knee=mirror(knees[index]),ankle=mirror(ankles[index]),end=mirror(ends[index]);
  const coxa=hip.clone().add(vec(-.02,-.08,side*.14));
  const pairs=[[hip,coxa,.026],[coxa,knee,.019],[knee,ankle,.012]];
  const bristles=new DetailBatch();
  for(const [a,b,r] of pairs) {
    rod(group,a,b,r,r*.70,mat.dark,'Leg_cuticle');
    ellipsoid(group,b,[r*1.2,r*1.35,r*1.2],mat.dark,'Joint');
    if(high) for(let k=0;k<25;k++) {
      const p=a.clone().lerp(b,random()),angle=random()*TAU;
      bristles.bristle(p,p.clone().add(vec(.012+random()*.015,Math.cos(angle)*.04,Math.sin(angle)*.04)),.0008,new THREE.Color(d.cuticle).multiplyScalar(1.9));
    }
  }
  for(let j=0;j<5;j++) {
    const a=ankle.clone().lerp(end,j/5),b=ankle.clone().lerp(end,(j+1)/5),r=.009*(1-j*.13);
    if(d.genus==='aedes') {
      const middle=a.clone().lerp(b,.23);
      rod(group,a,middle,r,r*.97,mat.pale,'Tarsal_pale_ring');
      rod(group,middle,b,r*.97,r*.8,mat.dark,'Tarsomere');
    } else rod(group,a,b,r,r*.8,mat.dark,'Tarsomere');
  }
  for(const s of [-1,1]) tube(group,[end,end.clone().add(vec(.025,-.018,s*.012)),end.clone().add(vec(.010,-.032,s*.017))],.0025,mat.dark,'Terminal_claw',5);
  if(high)group.add(bristles.build(pbr(0xffffff,.8,{vertexColors:true}),'Leg_microsetae'));
}

function wing(side,d,mat,high,random) {
  const pivot=new THREE.Group();pivot.name=side>0?'Wing_L':'Wing_R';
  pivot.scale.z=side;
  pivot.position.set(.19,.12,side*.225);
  const shape=new THREE.Shape();shape.moveTo(0,0);
  shape.bezierCurveTo(.45,.09,1.30,.24,2.18,.14);
  shape.bezierCurveTo(2.48,.10,2.65,.005,2.55,-.09);
  shape.bezierCurveTo(2.24,-.29,1.44,-.36,.56,-.18);
  shape.bezierCurveTo(.20,-.13,.06,-.04,0,0);
  const geo=new THREE.ShapeGeometry(shape,48);geo.rotateX(Math.PI/2);
  const film=pbr(0xd0c9b4,.34,{transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false,iridescence:.27,iridescenceThicknessRange:[140,360]});
  const membrane=mesh(geo,film,'Wing_membrane');membrane.castShadow=false;membrane.receiveShadow=false;pivot.add(membrane);
  const veins=[
    [[0,0],[.60,.11],[1.35,.177],[2.12,.13],[2.57,.01]],
    [[.02,-.01],[.65,.026],[1.34,.055],[1.96,.045],[2.57,.01]],
    [[.20,-.01],[.90,-.047],[1.54,-.02],[2.39,-.12]],
    [[.10,-.025],[.62,-.104],[1.23,-.14],[2.16,-.24]],
    [[.08,-.018],[.5,-.14],[1.01,-.24],[1.64,-.29]],
    [[1.31,.055],[1.64,.124],[2.24,.105]],
    [[1.51,-.02],[1.90,-.09],[2.46,-.08]],
    [[1.2,-.14],[1.46,-.22],[1.86,-.27]],
    [[.91,-.046],[.99,-.128]],[[1.16,.05],[1.20,-.04]],
  ];
  const veinMat=pbr(d.genus==='aedes'?0x4e4634:0x806d48,.66);
  for(let i=0;i<veins.length;i++) tube(pivot,veins[i].map(([x,z])=>vec(x,.003,z)),i<2?.0043:.0026,veinMat,'Wing_vein',5);
  const outline=shape.getSpacedPoints(170).map(v=>vec(v.x,.002,v.y));
  tube(pivot,outline,.0038,veinMat,'Costa_margin',5);
  const detail=new DetailBatch(),fringe=new DetailBatch();
  if(high) {
    for(const line of veins) for(let i=0;i<line.length-1;i++) {
      const a=vec(line[i][0],.006,line[i][1]),b=vec(line[i+1][0],.006,line[i+1][1]);
      const count=Math.ceil(a.distanceTo(b)*65);
      for(let k=0;k<count;k++) {
        const p=a.clone().lerp(b,k/count);
        const spotted=d.genus==='anopheles'&&Math.sin(p.x*14)>-.1;
        const c=new THREE.Color(spotted?0x2b251e:d.pale).multiplyScalar(spotted?.7:.35+random()*.3);
        detail.scale(p,vec(0,1,0),vec(.5,0,.5),.014,.0038,c,.0006);
      }
    }
    for(let i=4;i<outline.length-3;i++) {
      const p=outline[i],dir=vec(.15,0,p.z<0?-1:1).normalize();
      fringe.bristle(p,p.clone().addScaledVector(dir,.019+random()*.028),.0006,new THREE.Color(d.pale).multiplyScalar(.33));
    }
    pivot.add(detail.build(pbr(0xffffff,.65,{vertexColors:true,side:THREE.DoubleSide}),'Wing_vein_scales'));
    pivot.add(fringe.build(pbr(0xffffff,.8,{vertexColors:true}),'Wing_margin_fringe'));
  }
  return pivot;
}
function wingQuaternion(side,phase,mode) {
  if(mode==='rest')return new THREE.Quaternion().setFromEuler(new THREE.Euler(0,side*.095,.04));
  const spread=new THREE.Quaternion().setFromAxisAngle(vec(0,1,0),-side*.95);
  const flap=new THREE.Quaternion().setFromAxisAngle(vec(0,0,1),Math.sin(phase)*.58+.08);
  const pitch=new THREE.Quaternion().setFromAxisAngle(vec(1,0,0),side*Math.sin(phase+Math.PI*.45)*.24);
  return spread.multiply(flap).multiply(pitch);
}
function makeClip(hz) {
  const times=[],l=[],r=[];
  for(let i=0;i<=48;i++) {
    times.push(i/48/hz);
    wingQuaternion(1,i/48*TAU,'flight').toArray(l,l.length);
    wingQuaternion(-1,i/48*TAU,'flight').toArray(r,r.length);
  }
  return new THREE.AnimationClip('WingBeat',1/hz,[new THREE.QuaternionKeyframeTrack('Wing_L.quaternion',times,l),new THREE.QuaternionKeyframeTrack('Wing_R.quaternion',times,r)]);
}

export function createMosquito(species=SPECIES.AEDES_AEGYPTI,options={}) {
  const d=PROFILES[species];if(!d)throw new Error(`Unknown species: ${species}`);
  const high=options.quality!=='low',random=rng(species),root=new THREE.Group();
  root.name=`Mosquito_${species.replaceAll('-','_')}`;root.userData={species,label:d.label,version:'3.0',reconstruction:'artistic; not a diagnostic specimen'};
  const body=new THREE.Group();body.name='Body';root.add(body);
  const mat={dark:pbr(d.cuticle,.46),pale:pbr(d.pale,.63),brown:pbr(d.thorax,.56)};
  const thorax=new THREE.Group();thorax.name='Thorax';body.add(thorax);
  thorax.add(mesh(surfaceGeometry(thoraxPoint),pbr(0xffffff,.72,surfaceTextures(d,'thorax',random)),'Thoracic_cuticle'));
  groom(thorax,thoraxPoint,d,'thorax',random,high);
  // Small overlapping lateral plates, not inflated spheres.
  for(const side of [-1,1]) {
    const plate=ellipsoid(thorax,vec(-.03,-.13,side*.21),[.26,.115,.052],mat.brown,'Pleural_plate');plate.rotation.z=-.14;
    ellipsoid(thorax,vec(.32,.035,side*.075),[.15,.083,.12],mat.dark,'Scutellum');
    rod(body,vec(.37,-.065,side*.21),vec(.55,-.16,side*.37),.012,.008,mat.brown,'Haltere_stalk');
    ellipsoid(body,vec(.55,-.16,side*.37),[.037,.027,.026],mat.pale,'Haltere_knob');
  }
  const abdomen=new THREE.Group();abdomen.name='Abdomen';abdomen.position.set(.39,-.025,0);body.add(abdomen);
  const sample=(t,a)=>abdomenPoint(d,t,a);
  abdomen.add(mesh(surfaceGeometry(sample,160,80),pbr(0xffffff,.74,surfaceTextures(d,'abdomen',random)),'Segmented_abdominal_cuticle'));
  groom(abdomen,sample,d,'abdomen',random,high);
  for(const side of [-1,1])ellipsoid(abdomen,vec(d.length-.01,-.045,side*.021),[.055,.014,.012],mat.dark,'Terminal_cercus');
  const head=new THREE.Group();head.name='Head';head.position.set(-.54,-.08,0);body.add(head);
  ellipsoid(head,vec(0,0,0),[.17,.145,.145],mat.dark,'Head_capsule');
  for(const side of [-1,1])eye(head,side,d,high,random);
  tube(head,[[-.14,-.045,0],[-.68,-.10,0],[-1.42,-.19,0]],.012,mat.dark,'Proboscis',9);
  ellipsoid(head,vec(-1.425,-.19,0),[.024,.012,.012],mat.brown,'Labellum');
  const setae=new DetailBatch();
  for(const side of [-1,1]) {
    const palpLength=d.genus==='anopheles'?1.26:.23;
    tube(head,[[-.12,-.058,side*.035],[-.12-palpLength*.55,-.09,side*.054],[-.12-palpLength,-.16,side*.035]],.010,mat.dark,'Maxillary_palp',7);
    const base=vec(-.09,.08,side*.048),tip=vec(-.92,.29,side*.32);
    ellipsoid(head,base,[.024,.022,.022],mat.brown,'Antennal_pedicel');
    for(let i=0;i<13;i++) {
      const a=base.clone().lerp(tip,i/13),b=base.clone().lerp(tip,(i+1)/13);
      rod(head,a,b,.0054*(1-i*.035),.0043*(1-i*.035),mat.dark,'Antennal_flagellomere');
      for(let h=0;h<5;h++) {
        const angle=h/5*TAU+random()*.4,len=.035+random()*.045;
        const dir=vec(-.18,Math.cos(angle),Math.sin(angle)).normalize();
        setae.bristle(b,b.clone().addScaledVector(dir,len),.00065,new THREE.Color(d.pale).multiplyScalar(.33));
      }
    }
  }
  for(let i=0;i<180;i++) {
    const a=random()*TAU,t=random()*Math.PI,n=vec(Math.sin(t)*Math.cos(a),Math.cos(t),Math.sin(t)*Math.sin(a));
    const p=vec(n.x*.168,n.y*.144,n.z*.145);
    setae.scale(p,n,vec(1,0,0),.012,.003,new THREE.Color(d.pale).multiplyScalar(.5+random()*.5));
  }
  head.add(setae.build(pbr(0xffffff,.62,{vertexColors:true,side:THREE.DoubleSide}),'Head_scales_and_antennal_setae'));
  for(const side of [-1,1])for(let i=0;i<3;i++)leg(body,side,i,d,mat,random,high);
  const left=wing(1,d,mat,high,random),right=wing(-1,d,mat,high,random);body.add(left,right);
  const hz=THREE.MathUtils.clamp(options.wingHz??7,1,30),clip=makeClip(hz);root.animations=[clip];
  const mixer=new THREE.AnimationMixer(root),action=mixer.clipAction(clip);action.play();
  let mode='flight',elapsed=0;
  const api={mixer,wingAction:action,setWingSpeed(v){action.timeScale=THREE.MathUtils.clamp(v,0,4);},
    setPose(value){mode=value==='rest'?'rest':'flight';action.enabled=mode==='flight';
      if(mode==='rest'){left.quaternion.copy(wingQuaternion(1,0,mode));right.quaternion.copy(wingQuaternion(-1,0,mode));}
    },
    update(delta,animateBody=true){elapsed+=delta;if(mode==='flight')mixer.update(delta);
      body.position.y=animateBody&&mode==='flight'?Math.sin(elapsed*2)*.009:0;
    },
    dispose(){mixer.stopAllAction();mixer.uncacheRoot(root);const gs=new Set(),ms=new Set(),ts=new Set();
      root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)for(const m of [].concat(o.material)){ms.add(m);for(const v of Object.values(m))if(v?.isTexture)ts.add(v);}});
      for(const t of ts)t.dispose();for(const g of gs)g.dispose();for(const m of ms)m.dispose();
    },
  };
  for(const [key,value] of Object.entries(api))Object.defineProperty(root.userData,key,{value,enumerable:false});
  root.scale.setScalar(options.scale??1);root.userData.update(0);return root;
}
export function listMosquitoSpecies(){return Object.entries(PROFILES).map(([id,d])=>({id,label:d.label}));}
