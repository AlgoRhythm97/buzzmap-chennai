import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createMosquito, type MosquitoModel, type MosquitoModelId, type WingPose } from '../three/mosquito-models';

export interface MosquitoViewerHandle {
  /** Move the camera to the whole specimen or a close-up of the head. */
  setView(view: 'full' | 'macro'): void;
}

interface MosquitoViewerProps {
  species: MosquitoModelId;
  quality?: 'high' | 'low';
  pose?: WingPose;
  wingSpeed?: number;
  paused?: boolean;
  /** Slowly orbit the specimen until the user drags. */
  autoRotate?: boolean;
  className?: string;
  ref?: Ref<MosquitoViewerHandle>;
}

const BACKGROUND = 0x0f1214;
type Vec3 = [number, number, number];
const VIEWS: Record<'full' | 'macro', { target: Vec3; camera: Vec3 }> = {
  full: { target: [0.3, -0.16, 0], camera: [-2.8, 2.7, 7.7] },
  macro: { target: [-0.18, 0.025, 0], camera: [-1.1, 1.1, 2.25] },
};

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
}

/**
 * Interactive Three.js viewer for one procedural mosquito model.
 * Drag to orbit, scroll to zoom. Rendering pauses while the canvas is off-screen.
 */
export default function MosquitoViewer({
  species, quality = 'high', pose = 'flight', wingSpeed = 1, paused = false, autoRotate = false, className = '', ref,
}: MosquitoViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Stage | null>(null);
  const modelRef = useRef<MosquitoModel | null>(null);
  const pausedRef = useRef(paused);
  const [building, setBuilding] = useState(true);
  const [webglError, setWebglError] = useState<string>();

  pausedRef.current = paused;

  useImperativeHandle(ref, () => ({
    setView(view) {
      const stage = stageRef.current;
      if (!stage) return;
      stage.controls.target.set(...VIEWS[view].target);
      stage.camera.position.set(...VIEWS[view].camera);
      stage.controls.update();
    },
  }), []);

  // Renderer, lights, ground and render loop (adapted from mosquitoes/main.js)
  useEffect(() => {
    const container = containerRef.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      setWebglError('3D view needs WebGL, which is unavailable in this browser.');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === 'high' ? 2 : 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    renderer.domElement.className = 'block h-full w-full outline-none';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BACKGROUND);
    scene.fog = new THREE.FogExp2(BACKGROUND, 0.042);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.02, 80);
    camera.position.set(...VIEWS.full.camera);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...VIEWS.full.target);
    controls.enableDamping = true;
    controls.minDistance = 1.2;
    controls.maxDistance = 18;
    controls.maxPolarAngle = Math.PI * 0.88;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.6;
    const stopAutoRotate = () => { controls.autoRotate = false; };
    controls.addEventListener('start', stopAutoRotate);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const envMap = pmrem.fromScene(room, 0.025).texture;
    scene.environment = envMap;
    scene.environmentIntensity = 0.36;
    room.dispose();
    pmrem.dispose();

    const key = new THREE.DirectionalLight(0xffedd8, 3.1);
    key.position.set(-2, 5, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
    key.shadow.normalBias = 0.008;
    key.shadow.radius = 4;
    key.shadow.blurSamples = 8;
    const fill = new THREE.DirectionalLight(0xb6c8ba, 0.65);
    fill.position.set(-3, 1, -2);
    const rim = new THREE.DirectionalLight(0xe4eee5, 2.1);
    rim.position.set(3, 3, -4);
    scene.add(key, fill, rim, new THREE.HemisphereLight(0xb9cab8, 0x161a1d, 0.48));

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 150),
      new THREE.MeshStandardMaterial({ color: 0x1d2328, roughness: 0.94 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.125;
    floor.receiveShadow = true;
    scene.add(floor);

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    let visible = true;
    const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibilityObserver.observe(container);

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!visible) return;
      if (!pausedRef.current) modelRef.current?.userData.update(dt);
      controls.update();
      renderer.render(scene, camera);
    });

    stageRef.current = { renderer, scene, camera, controls };
    return () => {
      stageRef.current = null;
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      controls.removeEventListener('start', stopAutoRotate);
      controls.dispose();
      floor.geometry.dispose();
      floor.material.dispose();
      envMap.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [quality, autoRotate]);

  // Build the model off the first paint so the loading message shows (construction is synchronous)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    setBuilding(true);
    let model: MosquitoModel | undefined;
    const timer = window.setTimeout(() => {
      model = createMosquito(species, { quality, wingHz: 7 });
      model.userData.setWingSpeed(wingSpeed);
      model.userData.setPose(pose);
      stage.scene.add(model);
      modelRef.current = model;
      setBuilding(false);
    }, 30);
    return () => {
      window.clearTimeout(timer);
      if (model) {
        stage.scene.remove(model);
        model.userData.dispose();
        if (modelRef.current === model) modelRef.current = null;
      }
    };
    // Pose and speed are applied live by the effects below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [species, quality, autoRotate]);

  useEffect(() => { modelRef.current?.userData.setPose(pose); }, [pose, building]);
  useEffect(() => { modelRef.current?.userData.setWingSpeed(wingSpeed); }, [wingSpeed, building]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {(building || webglError) && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400 pointer-events-none">
          {webglError ?? 'Building 3D model…'}
        </div>
      )}
    </div>
  );
}
