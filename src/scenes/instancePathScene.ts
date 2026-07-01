// @ts-nocheck — TSL node types are incomplete in @types/three; logic matches official example.
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Inspector } from "three/addons/inspector/Inspector.js";
import {
  abs,
  add,
  color,
  float,
  instancedBufferAttribute,
  mod,
  positionLocal,
  screenUV,
  select,
  sin,
  time,
  vec3,
} from "three/tsl";

const COUNT = 1000;
const DESKTOP_CAMERA_Z = 15;
const MOBILE_MAX_WIDTH = 768;
const FIT_PADDING = 1.25;

function isMobileViewport() {
  return window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
}

function fitCameraToContent(
  camera: THREE.PerspectiveCamera,
  bounds: THREE.Box3,
  padding = FIT_PADDING,
) {
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.5 * padding;
  const fovRad = (camera.fov * Math.PI) / 180;
  const aspect = camera.aspect;
  const verticalDistance = radius / Math.sin(fovRad / 2);
  const horizontalFov = 2 * Math.atan(Math.tan(fovRad / 2) * aspect);
  const horizontalDistance = radius / Math.sin(horizontalFov / 2);

  camera.position.set(center.x, center.y, center.z + Math.max(verticalDistance, horizontalDistance));
  camera.lookAt(center);
  camera.updateProjectionMatrix();

  return center;
}

export async function createInstancePathScene(
  container: HTMLElement,
): Promise<() => void> {
  const camera = new THREE.PerspectiveCamera(
    60,
    container.clientWidth / container.clientHeight,
    0.01,
    100,
  );
  camera.position.z = DESKTOP_CAMERA_Z;

  const scene = new THREE.Scene();
  scene.backgroundNode = screenUV
    .distance(0.5)
    .remap(0, 0.65)
    .mix(color(0x94254c), color(0x000000));

  const x = 0;
  const y = 0;

  const path = new THREE.Path()
    .moveTo(x - 2.5, y - 2.5)
    .bezierCurveTo(x - 2.5, y - 2.5, x - 2, y, x, y)
    .bezierCurveTo(x + 3, y, x + 3, y - 3.5, x + 3, y - 3.5)
    .bezierCurveTo(x + 3, y - 5.5, x + 1, y - 7.7, x - 2.5, y - 9.5)
    .bezierCurveTo(x - 6, y - 7.7, x - 8, y - 5.5, x - 8, y - 3.5)
    .bezierCurveTo(x - 8, y - 3.5, x - 8, y, x - 5, y)
    .bezierCurveTo(x - 3.5, y, x - 2.5, y - 2.5, x - 2.5, y - 2.5);

  const geometry = new THREE.IcosahedronGeometry(0.1);
  const material = new THREE.MeshStandardNodeMaterial();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(2.5, 5, 0);
  mesh.count = COUNT;
  mesh.frustumCulled = false;

  scene.add(mesh);

  const point = new THREE.Vector2();
  const c = new THREE.Color();

  const positions: number[] = [];
  const times: number[] = [];
  const seeds: number[] = [];
  const colors: number[] = [];

  for (let i = 0; i < COUNT; i++) {
    const t = i / COUNT;
    path.getPointAt(t, point);

    positions.push(
      point.x + (0.5 - Math.random()),
      point.y + (0.5 - Math.random()),
      0.5 - Math.random(),
    );
    times.push(t);
    seeds.push(Math.random());

    c.setHSL(0.75 + Math.random() * 0.25, 1, 0.4);

    colors.push(c.r, c.g, c.b);
  }

  const contentBounds = new THREE.Box3();
  const worldPoint = new THREE.Vector3();
  for (let i = 0; i < COUNT; i++) {
    worldPoint.set(
      positions[i * 3] + mesh.position.x,
      positions[i * 3 + 1] + mesh.position.y,
      positions[i * 3 + 2] + mesh.position.z,
    );
    contentBounds.expandByPoint(worldPoint);
  }
  // Account for instance scale animation and vertical bobbing.
  contentBounds.expandByScalar(0.75);

  const positionAttribute = new THREE.InstancedBufferAttribute(
    new Float32Array(positions),
    3,
  );
  const colorAttribute = new THREE.InstancedBufferAttribute(
    new Float32Array(colors),
    3,
  );
  const timeAttribute = new THREE.InstancedBufferAttribute(
    new Float32Array(times),
    1,
  );
  const seedAttribute = new THREE.InstancedBufferAttribute(
    new Float32Array(seeds),
    1,
  );

  const instancePosition = instancedBufferAttribute(positionAttribute);
  const instanceColor = instancedBufferAttribute(colorAttribute);
  const instanceSeed = instancedBufferAttribute(seedAttribute);
  const instanceTime = instancedBufferAttribute(timeAttribute);

  const localTime = instanceTime.add(time);
  const modTime = mod(time.mul(0.4), 1);

  const s0 = sin(localTime.add(instanceSeed)).mul(0.25);

  const dist = abs(instanceTime.sub(modTime)).toConst();
  const wrapDist = select(
    dist.greaterThan(0.5),
    dist.oneMinus(),
    dist,
  ).toConst();
  const s1 = select(
    wrapDist.greaterThan(0.1),
    float(1),
    wrapDist.remap(0, 0.1, 3, 1),
  );

  const offset = vec3(
    instancePosition.x,
    instancePosition.y.add(s0),
    instancePosition.z,
  ).toConst("offset");
  material.positionNode = add(positionLocal.mul(s1), offset);
  material.colorNode = instanceColor;

  const renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.NeutralToneMapping;

  if (import.meta.env.DEV) {
    renderer.inspector = new Inspector();
  }

  container.appendChild(renderer.domElement);

  await renderer.init();

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  let controlsTarget = new THREE.Vector3(0, 0, 0);

  function applyViewportLayout() {
    camera.aspect = container.clientWidth / container.clientHeight;

    if (isMobileViewport()) {
      controlsTarget = fitCameraToContent(camera, contentBounds);
      controls.target.copy(controlsTarget);
    } else {
      camera.position.set(0, 0, DESKTOP_CAMERA_Z);
      controlsTarget.set(0, 0, 0);
      controls.target.copy(controlsTarget);
      camera.lookAt(controlsTarget);
      camera.updateProjectionMatrix();
    }

    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  applyViewportLayout();

  function onWindowResize() {
    applyViewportLayout();
  }

  function animate() {
    controls.update();
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(animate);
  window.addEventListener("resize", onWindowResize);

  return () => {
    window.removeEventListener("resize", onWindowResize);
    renderer.setAnimationLoop(null);
    controls.dispose();
    geometry.dispose();
    material.dispose();
    pmremGenerator.dispose();
    scene.environment?.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
