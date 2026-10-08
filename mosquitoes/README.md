# Mosquito specimens — version 3

Six reference-inspired female mosquito reconstructions for Three.js: Aedes aegypti, Aedes albopictus, Anopheles arabiensis, Anopheles gambiae, Culex pipiens and Culex quinquefasciatus.

Version 3 replaces the previous geometry. It uses a slimmer continuous body, thousands of overlapping mesh scales, small hexagonal eye lenses, fine tapered bristles, narrow jointed legs, five tarsal sections, forked claws, halteres, veined wing membranes and textured cuticle. The Anopheles profiles have longer palps and patterned vein scales. Color, markings and proportions vary by profile; these artistic reconstructions are not validated taxonomic identification models. Blood feeding is not treated as a species characteristic.

## Start

Open PowerShell in this folder and run:

```powershell
npm run dev
```

Open the **exact URL printed by the server**. If common ports are occupied it selects an available port automatically. Keep PowerShell open. The included server needs Node.js but no npm install. The pinned Three.js 0.180.0 modules load from jsDelivr, so internet access is needed.

If updating an already open viewer, press Ctrl+F5. If starting from an older extracted ZIP, extract the new ZIP into a new folder first.

## Viewer

- Species: choose one of the six profiles.
- Beating: a deliberately slowed 7 Hz demonstration, adjustable using the speed control. This is not a claim about biological wingbeat frequency.
- Folded: wings overlap along the abdomen for close inspection.
- Macro view: examine the eyes, scales, hairs and veins.
- Full specimen: restore the initial camera.
- Export animated GLB: generates a standalone asset with embedded textures and a `WingBeat` clip. The exporter reloads the GLB and checks both wing rotations before downloading it. Export always includes animation, even if the viewer is paused or folded.

The files are generated procedurally; no photo billboards or generated still images are substituted for 3D geometry. The supplied reference photos are not embedded or redistributed.

## Integrate the JavaScript model

Copy `mosquito-models.js` into your existing Three.js project. It imports only `three`. Model construction needs a browser canvas for the generated texture maps.

```js
import * as THREE from 'three';
import { createMosquito, SPECIES } from './mosquito-models.js';

const mosquito = createMosquito(SPECIES.AEDES_AEGYPTI, {
  quality: 'high', // 'low' reduces scales, eye lenses and fine hairs
  wingHz: 7,
  scale: 1,
});
scene.add(mosquito);

// In your existing render loop, once per frame:
mosquito.userData.update(deltaSeconds);

// Optional controls:
mosquito.userData.setWingSpeed(0.5);
mosquito.userData.setPose('rest'); // or 'flight'

// When replacing/removing the model:
scene.remove(mosquito);
mosquito.userData.dispose();
```

The model faces negative X, with positive Y upward. Units are normalized artistic units, not millimetres. The body extends roughly from X -0.7 to +2.4, with a larger envelope for legs, proboscis and spread wings.

## Load an exported GLB

```js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltf = await new GLTFLoader().loadAsync('/models/aedes-aegypti-v3-animated.glb');
scene.add(gltf.scene);
const mixer = new THREE.AnimationMixer(gltf.scene);
mixer.clipAction(gltf.animations.find(clip => clip.name === 'WingBeat')).play();

// In your existing render loop:
mixer.update(deltaSeconds);
```

Animation is stored as quaternion tracks on `Wing_L` and `Wing_R`. A GLB stores the mesh, materials and animation; the JavaScript convenience functions above do not travel with it.

## Detail and performance

High detail is intended for **one close-up specimen**: approximately 216,000–218,000 triangles and 17.6 MB per uncompressed exported GLB. Scales and lenses are batched into meshes. Do not load all six high-detail models simultaneously on a mobile page. Use `quality: 'low'`, cap pixel ratio, and evaluate the result on your target devices. Additional mesh/texture compression can be applied in your asset pipeline.

These are substantially more detailed artistic models, not scans or film-production assets. Closely related species share substantial geometry, with visually interpreted profile differences from the supplied references.

## Verification

Open `verify.html` on the same local server and click **Verify all six species**. It checks finite geometry, GLB export and reload, two quaternion wing tracks, actual wing movement and loop closure. The export button independently performs the same wing-motion check for each downloaded asset.
