import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createMosquito, listMosquitoSpecies, SPECIES } from './mosquito-models.js';

const canvas=document.querySelector('#scene'),scene=new THREE.Scene();
scene.background=new THREE.Color(0x101815);
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;
const camera=new THREE.PerspectiveCamera(32,1,.02,80);
camera.position.set(-2.8,2.7,7.7);
const controls=new OrbitControls(camera,canvas);controls.target.set(.30,-.16,0);
controls.enableDamping=true;controls.minDistance=1.2;controls.maxDistance=18;controls.maxPolarAngle=Math.PI*.88;
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();
const env=pmrem.fromScene(room,.025);scene.environment=env.texture;scene.environmentIntensity=.36;room.dispose();pmrem.dispose();
const key=new THREE.DirectionalLight(0xffedd8,3.1);key.position.set(-2,5,3);
key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;
key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.008;
key.shadow.radius=4;key.shadow.blurSamples=8;scene.add(key);
const fill=new THREE.DirectionalLight(0xb6c8ba,.65);fill.position.set(-3,1,-2);scene.add(fill);
const rim=new THREE.DirectionalLight(0xe4eee5,2.1);rim.position.set(3,3,-4);scene.add(rim);
scene.add(new THREE.HemisphereLight(0xb9cab8,0x18271d,.48));

// Subtle organic ground with fine relief, kept below the legs.
const groundCanvas=document.createElement('canvas');groundCanvas.width=groundCanvas.height=512;
const gc=groundCanvas.getContext('2d');gc.fillStyle='#737373';gc.fillRect(0,0,512,512);
for(let i=0;i<18000;i++) {const v=90+Math.random()*75;gc.fillStyle=`rgb(${v},${v},${v})`;gc.fillRect(Math.random()*512,Math.random()*512,1,1);}
const relief=new THREE.CanvasTexture(groundCanvas);relief.wrapS=relief.wrapT=THREE.RepeatWrapping;relief.repeat.set(7,7);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(150,150),new THREE.MeshStandardMaterial({color:0x26362a,roughness:.94,bumpMap:relief,bumpScale:.016}));
floor.rotation.x=-Math.PI/2;floor.position.y=-1.125;floor.receiveShadow=true;scene.add(floor);
scene.fog=new THREE.FogExp2(0x101815,.042);

const selector=document.querySelector('#species'),speed=document.querySelector('#wing-speed'),pose=document.querySelector('#pose');
const status=document.querySelector('#status'),pause=document.querySelector('#pause'),exportButton=document.querySelector('#export');
let mosquito,paused=false;
for(const entry of listMosquitoSpecies()){const opt=document.createElement('option');opt.value=entry.id;opt.textContent=entry.label;selector.append(opt);}
selector.value=SPECIES.AEDES_AEGYPTI;
function loadSpecies(id){
  if(mosquito){scene.remove(mosquito);mosquito.userData.dispose();}
  mosquito=createMosquito(id,{quality:'high',wingHz:7});
  mosquito.userData.setWingSpeed(Number(speed.value));mosquito.userData.setPose(pose.value);scene.add(mosquito);
  document.querySelector('#species-title').textContent=mosquito.userData.label;
  status.textContent='Drag to orbit · scroll to examine';
}
selector.addEventListener('change',()=>loadSpecies(selector.value));
speed.addEventListener('input',()=>{mosquito.userData.setWingSpeed(Number(speed.value));document.querySelector('#speed-value').textContent=`${Number(speed.value).toFixed(1)}×`;});
pose.addEventListener('change',()=>mosquito.userData.setPose(pose.value));
pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'Resume motion':'Pause motion';});
document.querySelector('#macro').addEventListener('click',()=>{
  controls.target.set(-.18,.025,0);camera.position.set(-1.1,1.10,2.25);controls.update();
});
document.querySelector('#reset').addEventListener('click',()=>{
  controls.target.set(.30,-.16,0);camera.position.set(-2.8,2.7,7.7);controls.update();
});

// Export a fresh model with its neutral transforms; verify the embedded animation
// by loading the resulting GLB and checking that both wing quaternions change.
exportButton.addEventListener('click',async()=>{
  const exportSpecies=selector.value;
  exportButton.disabled=true;status.textContent='Building model and checking its wing animation…';
  let specimen,loaded;
  try {
    specimen=createMosquito(exportSpecies,{quality:'high',wingHz:7});
    const bytes=await new GLTFExporter().parseAsync(specimen,{binary:true,animations:specimen.animations,trs:true});
    loaded=await new GLTFLoader().parseAsync(bytes,'');
    const clip=loaded.animations.find(c=>c.name==='WingBeat');
    if(!clip||clip.tracks.length!==2)throw new Error('Export is missing both wing animation tracks.');
    const mixer=new THREE.AnimationMixer(loaded.scene);mixer.clipAction(clip).play();mixer.setTime(0);
    const wings=['Wing_L','Wing_R'].map(n=>loaded.scene.getObjectByName(n));
    if(wings.some(w=>!w))throw new Error('Export is missing a wing pivot.');
    const initial=wings.map(w=>w.quaternion.clone());mixer.setTime(clip.duration*.25);
    if(wings.some((w,i)=>w.quaternion.angleTo(initial[i])<.1))throw new Error('Exported wing motion did not survive reload.');
    const url=URL.createObjectURL(new Blob([bytes],{type:'model/gltf-binary'}));
    const a=document.createElement('a');a.href=url;a.download=`${exportSpecies}-v3-animated.glb`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
    status.textContent=`Export verified · ${(bytes.byteLength/1048576).toFixed(1)} MB · two animated wings`;
    mixer.stopAllAction();mixer.uncacheRoot(loaded.scene);
  }catch(error){status.textContent=`Export failed: ${error.message}`;console.error(error);}
  finally {
    specimen?.userData.dispose();
    if(loaded){const g=new Set(),m=new Set(),t=new Set();loaded.scene.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)for(const mat of [].concat(o.material)){m.add(mat);for(const v of Object.values(mat))if(v?.isTexture)t.add(v);}});for(const x of g)x.dispose();for(const x of m)x.dispose();for(const x of t)x.dispose();}
    exportButton.disabled=false;
  }
});

function resize(){
  const w=canvas.clientWidth,h=canvas.clientHeight;
  if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio())){
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  }
}
const clock=new THREE.Clock();loadSpecies(selector.value);
renderer.setAnimationLoop(()=>{const dt=Math.min(clock.getDelta(),.05);resize();if(!paused)mosquito.userData.update(dt);controls.update();renderer.render(scene,camera);});
