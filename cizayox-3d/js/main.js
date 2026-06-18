import * as THREE from '../vendor/three/three.module.js';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';
import { buildProceduralScizor } from './scizor-model.js';
import { setupScizorAnimation } from './scizor-animation.js';
import { tuningState } from './tuning-state.js';
import { initTuningPanel } from './tuning-panel.js';
import { initHitboxVisuals, updateHitboxVisuals } from './hitbox-visual.js';
import {
  initZoroarkEnemy,
  updateZoroarkEnemy,
  applyZoroarkTuning,
  getZoroarkEnemy,
  damageZoroark,
  getZoroarkHitCenter,
  getZoroarkHitRadius,
  isZoroarkAlive,
} from './zoroark-enemy.js';

const MODEL_PATHS = [
  new URL('../models/pokemon_sv_scizor.glb', import.meta.url).href,
  new URL('../models/cizayox.glb', import.meta.url).href,
];

const WORLD_SIZE = 80;
const TREE_COUNT = 55;
const ROCK_COUNT = 18;
const BUSH_COUNT = 40;

function getGroundHeight() {
  return 0;
}

const keys = new Set();
let jumpPressed = false;
const player = {
  x: 0,
  z: 0,
  y: getGroundHeight(0, 0),
  vy: 0,
  vx: 0,
  vz: 0,
  angle: 0,
  footing: null,
  hp: 100,
  maxHp: 100,
  hitRadius: 0.85,
};

const cameraControl = {
  yaw: 0,
  pitch: 0.4,
  distance: 11,
  sensitivity: 0.0032,
};

const aimControl = {
  yaw: 0,
  pitch: 0.06,
  sensitivity: 0.0024,
};

let isAiming = false;
let crosshairEl = null;

let scene;
let camera;
let renderer;
let scizorMesh;
let scizorBaseScale = 1;
let scizorAnimator = null;
/** Décalage Y du modèle GLB (face locale opposée à +Z). */
let modelYawOffset = 0;
let characterLight = null;
let obstacles = [];
let clock;
let canvas;
let gameRunning = false;

/** @type {{ mesh: THREE.Mesh, vx: number, vz: number, vy: number, life: number, owner: 'player' | 'enemy' }[]} */
const lasers = [];
let lastShootTime = -1;
let pendingLaserShot = false;
let combatEnded = false;
let playerHpBar = null;
let enemyHpBar = null;
let combatStatusEl = null;
/** @type {ReturnType<typeof initHitboxVisuals> | null} */
let hitboxVisuals = null;

const LASER_DAMAGE = 15;
const ENEMY_LASER_DAMAGE = 12;

const _muzzle = new THREE.Vector3();
const _aimDir = new THREE.Vector3();
const _modelForward = new THREE.Vector3();
const _shoulder = new THREE.Vector3();
const _aimLook = new THREE.Vector3();
const _camOffset = new THREE.Vector3();
const _freeCamPos = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _aimEuler = new THREE.Euler(0, 0, 0, 'YXZ');

const AIM_FOV = 48;
const NORMAL_FOV = 55;

const MUZZLE_FORWARD = 1.05;

const LASER_SPEED = 42;
const LASER_LIFETIME = 1.1;
const LASER_COOLDOWN = 0.22;
const LASER_LENGTH = 1.7;

function showFatalError(err, step = '') {
  gameRunning = false;
  const overlay = document.getElementById('error-overlay');
  const msg = document.getElementById('error-message');
  const loading = document.getElementById('loading');
  if (loading) loading.classList.add('loading--hidden');
  if (overlay) overlay.classList.add('is-visible');
  const text = [
    step ? `Étape : ${step}` : null,
    err?.message,
    err?.stack,
    err ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : null,
  ].filter(Boolean).join('\n\n') || 'Erreur inconnue (aucun détail)';
  if (msg) msg.textContent = text;
  console.error('[Cizayox]', step, err);
}

function init() {
  canvas = document.getElementById('canvas');
  if (!canvas) throw new Error('Canvas introuvable');

  clock = new THREE.Clock();
  gameRunning = true;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b8d8);
  scene.fog = new THREE.Fog(0x9ec8e0, 18, 70);

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const hemi = new THREE.HemisphereLight(0xd8eeff, 0x4a7a45, 1.05);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0xc8d8f0, 0.45);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff8e8, 1.45);
  sun.position.set(20, 35, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xb8d4ff, 0.65);
  fill.position.set(-18, 14, -10);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0xffe8b0, 0.5);
  rim.position.set(-10, 8, 20);
  scene.add(rim);

  characterLight = new THREE.PointLight(0xfff4d0, 1.4, 18, 1.6);
  scene.add(characterLight);

  buildGround();
  buildForest();
  buildScizor();
  hitboxVisuals = initHitboxVisuals(scene);
  initZoroarkEnemy({ scene, isTerrainBlocked, onReady: applyCombatTuning });
  crosshairEl = document.getElementById('crosshair');
  playerHpBar = document.getElementById('player-hp-fill');
  enemyHpBar = document.getElementById('enemy-hp-fill');
  combatStatusEl = document.getElementById('combat-status');
  setupInput();
  initTuningPanel(applyCombatTuning);
  applyCombatTuning();
  updateCombatHud();

  document.getElementById('loading')?.classList.add('loading--hidden');
  animate();
}

function setupInput() {
  window.addEventListener('resize', onResize);
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Space') jumpPressed = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
    if (e.code === 'Space') jumpPressed = false;
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  function isPointerLocked() {
    return document.pointerLockElement === canvas;
  }

  function setPointerLockState(locked) {
    document.body.classList.toggle('is-pointer-locked', locked);
    document.body.classList.toggle('is-pointer-unlocked', !locked);
  }

  document.addEventListener('pointerlockchange', () => {
    const locked = isPointerLocked();
    setPointerLockState(locked);
    if (!locked && isAiming) {
      setAimMode(false);
    }
  });

  document.addEventListener('pointerlockerror', () => {
    console.warn('[Cizayox] Impossible de capturer la souris');
    setPointerLockState(false);
  });

  function setAimMode(active) {
    if (!active && isAiming) {
      syncFreeCameraFromAim();
    }
    isAiming = active;
    document.body.classList.toggle('is-aiming', active);
    crosshairEl?.classList.toggle('crosshair--visible', active);
  }

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      e.preventDefault();
      if (!isPointerLocked()) canvas.requestPointerLock();
      syncAimFromFreeCamera();
      setAimMode(true);
      return;
    }

    if (e.button !== 0) return;
    e.preventDefault();

    if (!isPointerLocked()) {
      canvas.requestPointerLock();
      return;
    }

    if (!combatEnded) requestLaserShot();
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button !== 2) return;
    setAimMode(false);
  });

  document.addEventListener('mousemove', (e) => {
    if (!isPointerLocked()) return;

    const control = isAiming ? aimControl : cameraControl;
    control.yaw -= e.movementX * control.sensitivity;
    if (isAiming) {
      control.pitch += e.movementY * control.sensitivity;
      aimControl.pitch = THREE.MathUtils.clamp(aimControl.pitch, -0.32, 0.48);
    } else {
      control.pitch -= e.movementY * control.sensitivity;
      cameraControl.pitch = THREE.MathUtils.clamp(cameraControl.pitch, -0.45, 1.52);
    }
  });

  setPointerLockState(false);
  setAimMode(false);
}

function buildGround() {
  const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 1, 1);

  const mat = new THREE.MeshStandardMaterial({
    color: 0x4f8f4a,
    roughness: 0.92,
    metalness: 0.02,
    flatShading: true,
  });

  const ground = new THREE.Mesh(geo, mat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const pathGeo = new THREE.CircleGeometry(5, 32);
  const pathMat = new THREE.MeshStandardMaterial({ color: 0x6b9a55, roughness: 1 });
  const clearing = new THREE.Mesh(pathGeo, pathMat);
  clearing.rotation.x = -Math.PI / 2;
  clearing.position.y = 0.01;
  scene.add(clearing);
}

function getTerrainFooting() {
  return { groundY: 0, pitch: 0, roll: 0, hLeft: 0, hRight: 0 };
}

function isPlayerGrounded(groundY) {
  return player.y <= groundY + 0.06 && player.vy <= 0.2;
}

function randomPoint(minDist = 4) {
  for (let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * (WORLD_SIZE - 10);
    const z = (Math.random() - 0.5) * (WORLD_SIZE - 10);
    if (Math.hypot(x, z) > minDist) return { x, z };
  }
  return { x: 10, z: 10 };
}

function buildTree(x, z, scale = 1) {
  const group = new THREE.Group();
  const y = getGroundHeight(x, z);

  const trunkGeo = new THREE.CylinderGeometry(0.25 * scale, 0.35 * scale, 2.2 * scale, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d24, roughness: 1 });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = 1.1 * scale;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const foliageMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setHSL(0.28 + Math.random() * 0.06, 0.55, 0.32 + Math.random() * 0.08),
    roughness: 0.95,
    flatShading: true,
  });

  for (let i = 0; i < 3; i++) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry((1.6 - i * 0.25) * scale, (1.8 - i * 0.2) * scale, 7),
      foliageMat
    );
    cone.position.y = (2.4 + i * 1.1) * scale;
    cone.castShadow = true;
    group.add(cone);
  }

  group.position.set(x, y, z);
  group.rotation.y = Math.random() * Math.PI * 2;
  scene.add(group);

  obstacles.push({ x, z, radius: 0.9 * scale });
}

function buildRock(x, z, scale = 1) {
  const geo = new THREE.DodecahedronGeometry(0.55 * scale, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0x7a7f86, roughness: 0.85, flatShading: true });
  const rock = new THREE.Mesh(geo, mat);
  const y = getGroundHeight(x, z);
  rock.position.set(x, y + 0.3 * scale, z);
  rock.rotation.set(Math.random(), Math.random(), Math.random());
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
  obstacles.push({ x, z, radius: 0.7 * scale });
}

function buildBush(x, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x3d7a3a, roughness: 1, flatShading: true });
  const bush = new THREE.Mesh(new THREE.SphereGeometry(0.55, 7, 6), mat);
  const y = getGroundHeight(x, z);
  bush.position.set(x, y + 0.35, z);
  bush.scale.set(1.2, 0.8, 1.1);
  bush.castShadow = true;
  scene.add(bush);
  obstacles.push({ x, z, radius: 0.55 });
}

function buildForest() {
  for (let i = 0; i < TREE_COUNT; i++) {
    const { x, z } = randomPoint(6);
    buildTree(x, z, 0.85 + Math.random() * 0.5);
  }
  for (let i = 0; i < ROCK_COUNT; i++) {
    const { x, z } = randomPoint(5);
    buildRock(x, z, 0.7 + Math.random() * 0.8);
  }
  for (let i = 0; i < BUSH_COUNT; i++) {
    const { x, z } = randomPoint(3.5);
    buildBush(x, z);
  }
}

function addScizorToScene(model, { fromFile = false } = {}) {
  scizorMesh = model;

  modelYawOffset = 0;

  scizorMesh.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.side = THREE.DoubleSide;
        if ('metalness' in child.material) {
          child.material.metalness = Math.min(child.material.metalness ?? 0.2, 0.35);
          child.material.roughness = Math.max(child.material.roughness ?? 0.6, 0.45);
        }
      }
    }
  });

  const targetHeight = 2.6;
  let box = new THREE.Box3().setFromObject(scizorMesh);
  const size = box.getSize(new THREE.Vector3());
  scizorBaseScale = targetHeight / Math.max(size.y, size.x, size.z, 0.001);
  scizorMesh.scale.setScalar(scizorBaseScale);

  box = new THREE.Box3().setFromObject(scizorMesh);
  const center = box.getCenter(new THREE.Vector3());
  scizorMesh.position.sub(center);
  box = new THREE.Box3().setFromObject(scizorMesh);
  scizorMesh.position.y -= box.min.y;
  scene.add(scizorMesh);
  scizorAnimator = fromFile ? setupScizorAnimation(scizorMesh) : null;
}

function tryLoadModel(paths, index = 0) {
  if (index >= paths.length) {
    console.warn('Aucun modèle GLB trouvé, utilisation du modèle intégré.');
    addScizorToScene(buildProceduralScizor());
    return;
  }

  const gltfLoader = new GLTFLoader();
  gltfLoader.load(
    paths[index],
    (gltf) => {
      addScizorToScene(gltf.scene, { fromFile: true });
    },
    undefined,
    (err) => {
      console.warn(`Échec chargement ${paths[index]}:`, err);
      tryLoadModel(paths, index + 1);
    }
  );
}

function buildScizor() {
  tryLoadModel(MODEL_PATHS);
}

function isTerrainBlocked(x, z, radius = 0.7) {
  const limit = WORLD_SIZE / 2 - 2;
  if (Math.abs(x) > limit || Math.abs(z) > limit) return true;
  return obstacles.some((o) => Math.hypot(x - o.x, z - o.z) < o.radius + radius);
}

function isBlocked(x, z, radius = 0.7) {
  if (isTerrainBlocked(x, z, radius)) return true;

  const foe = getZoroarkEnemy();
  if (foe?.alive && Math.hypot(x - foe.x, z - foe.z) < foe.hitRadius + radius) {
    return true;
  }

  return false;
}

function getWorldInput() {
  let localX = 0;
  let localZ = 0;

  if (keys.has('KeyZ') || keys.has('KeyW') || keys.has('ArrowUp')) localZ += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) localZ -= 1;
  if (keys.has('KeyQ') || keys.has('KeyA') || keys.has('ArrowLeft')) localX -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) localX += 1;

  const len = Math.hypot(localX, localZ);
  if (len === 0) return { x: 0, z: 0 };

  localX /= len;
  localZ /= len;
  if (isAiming) {
    localX = -localX;
    localZ = -localZ;
  }

  const yaw = isAiming ? aimControl.yaw : cameraControl.yaw;
  const sin = Math.sin(yaw);
  const cos = Math.cos(yaw);

  const forwardX = sin;
  const forwardZ = cos;
  const rightX = cos;
  const rightZ = -sin;

  const worldX = localX * rightX - localZ * forwardX;
  const worldZ = localX * rightZ - localZ * forwardZ;

  return { x: worldX, z: worldZ };
}

function updatePlayer(dt) {
  const input = getWorldInput();
  const maxSpeed = 7.5;
  const accel = 24;
  const friction = 12;

  if (input.x !== 0 || input.z !== 0) {
    player.vx = THREE.MathUtils.lerp(player.vx, input.x * maxSpeed, 1 - Math.exp(-accel * dt));
    player.vz = THREE.MathUtils.lerp(player.vz, input.z * maxSpeed, 1 - Math.exp(-accel * dt));
    if (!isAiming) {
      player.angle = Math.atan2(player.vx, player.vz);
    }
  } else {
    player.vx = THREE.MathUtils.lerp(player.vx, 0, 1 - Math.exp(-friction * dt));
    player.vz = THREE.MathUtils.lerp(player.vz, 0, 1 - Math.exp(-friction * dt));
  }

  const nextX = player.x + player.vx * dt;
  const nextZ = player.z + player.vz * dt;

  if (!isBlocked(nextX, player.z)) player.x = nextX;
  else player.vx = 0;

  if (!isBlocked(player.x, nextZ)) player.z = nextZ;
  else player.vz = 0;

  const footing = getTerrainFooting();
  const onGround = isPlayerGrounded(footing.groundY);

  if (jumpPressed && onGround) {
    player.vy = 5.5;
    jumpPressed = false;
  }

  player.vy -= 16 * dt;
  player.y += player.vy * dt;

  if (onGround) {
    player.y = THREE.MathUtils.lerp(player.y, footing.groundY, 1 - Math.exp(-20 * dt));
    if (Math.abs(player.y - footing.groundY) < 0.02) {
      player.y = footing.groundY;
      player.vy = 0;
    }
  } else if (player.y < footing.groundY) {
    player.y = footing.groundY;
    player.vy = 0;
  }

  if (!Number.isFinite(player.y)) {
    player.y = footing.groundY;
    player.vy = 0;
  }

  player.footing = footing;
}

function updateScizor(dt) {
  if (!scizorMesh) return;

  const footing = player.footing ?? getTerrainFooting();
  const speed = Math.hypot(player.vx, player.vz);
  const grounded = isPlayerGrounded(footing.groundY);
  const bob = isAiming
    ? 0
    : grounded
      ? Math.sin(clock.elapsedTime * 8) * 0.015 * Math.min(speed / 7.5, 1)
      : 0;

  scizorMesh.position.set(player.x, player.y + tuningState.height + bob, player.z);
  scizorMesh.rotation.order = 'YXZ';

  if (isAiming) {
    getAimDirection(_aimDir);
    player.angle = Math.atan2(_aimDir.x, _aimDir.z);
    scizorMesh.rotation.x = 0;
    scizorMesh.rotation.z = 0;
  } else {
    scizorMesh.rotation.x = footing.pitch;
    scizorMesh.rotation.z = footing.roll;
  }

  scizorMesh.rotation.y = player.angle + modelYawOffset;
  scizorMesh.scale.setScalar(scizorBaseScale);

  if (characterLight) {
    characterLight.position.set(player.x, player.y + 2.2, player.z + 1.2);
  }

  try {
    scizorAnimator?.update(isAiming ? 0 : speed, clock.elapsedTime, dt);
  } catch (err) {
    console.error('[Cizayox] Animation:', err);
  }

  if (pendingLaserShot) {
    spawnLaserFromHand();
    pendingLaserShot = false;
  }
}

function requestLaserShot() {
  if (!clock || !scene || player.hp <= 0) return;
  const now = clock.elapsedTime;
  if (now - lastShootTime < LASER_COOLDOWN) return;
  lastShootTime = now;
  scizorAnimator?.triggerShoot?.();
  pendingLaserShot = true;
}

function applyCombatTuning() {
  player.hitRadius = tuningState.playerHitRadius;
  applyZoroarkTuning();
}

function getPlayerHitCenter() {
  return {
    x: player.x,
    y: player.y + tuningState.height + tuningState.playerHitCenterY,
    z: player.z,
  };
}

function damagePlayer(amount) {
  if (player.hp <= 0 || combatEnded) return;
  player.hp = Math.max(0, player.hp - amount);
  updateCombatHud();
  if (player.hp <= 0) endCombat('defeat');
}

function updateCombatHud() {
  const enemy = getZoroarkEnemy();
  const playerPct = (player.hp / player.maxHp) * 100;
  const enemyPct = enemy ? (enemy.hp / enemy.maxHp) * 100 : 0;

  if (playerHpBar) playerHpBar.style.width = `${playerPct}%`;
  if (enemyHpBar) enemyHpBar.style.width = `${enemyPct}%`;

  const playerLabel = document.getElementById('player-hp-text');
  const enemyLabel = document.getElementById('enemy-hp-text');
  if (playerLabel) playerLabel.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
  if (enemyLabel) enemyLabel.textContent = enemy
    ? `${Math.ceil(enemy.hp)} / ${enemy.maxHp}`
    : '—';
}

function endCombat(result) {
  if (combatEnded) return;
  combatEnded = true;
  if (!combatStatusEl) return;

  combatStatusEl.classList.add('combat-status--visible');
  if (result === 'victory') {
    combatStatusEl.textContent = 'Victoire — Zoroark vaincu !';
    combatStatusEl.classList.add('combat-status--win');
  } else {
    combatStatusEl.textContent = 'Défaite — Cizayox est KO…';
    combatStatusEl.classList.add('combat-status--lose');
  }
}

function hitSphere(laserPos, target, radius) {
  const dx = laserPos.x - target.x;
  const dy = laserPos.y - target.y;
  const dz = laserPos.z - target.z;
  return Math.hypot(dx, dy, dz) < radius + 0.15;
}

function removeLaser(index) {
  const laser = lasers[index];
  scene.remove(laser.mesh);
  laser.mesh.geometry.dispose();
  laser.mesh.material.dispose();
  lasers.splice(index, 1);
}

function checkLaserHits() {
  for (let i = lasers.length - 1; i >= 0; i--) {
    const laser = lasers[i];
    const pos = laser.mesh.position;

    if (laser.owner === 'player' && isZoroarkAlive()) {
      const center = getZoroarkHitCenter();
      if (center && hitSphere(pos, center, getZoroarkHitRadius())) {
        damageZoroark(LASER_DAMAGE);
        removeLaser(i);
        updateCombatHud();
        if (!isZoroarkAlive()) endCombat('victory');
      }
    } else if (laser.owner === 'enemy' && player.hp > 0) {
      const center = getPlayerHitCenter();
      if (hitSphere(pos, center, player.hitRadius)) {
        damagePlayer(laser.damage ?? ENEMY_LASER_DAMAGE);
        removeLaser(i);
      }
    }
  }
}

function computeFreeCameraPosition(out = _freeCamPos, control = cameraControl) {
  const targetY = player.y + 1.3 + tuningState.height;
  const { yaw, pitch } = control;
  const baseDistance = control.distance ?? cameraControl.distance;

  const lowAngle = THREE.MathUtils.smoothstep(0.4 - pitch, 0, 0.65);
  const effectiveDistance = THREE.MathUtils.lerp(baseDistance, baseDistance * 0.32, lowAngle);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  out.x = player.x + Math.sin(yaw) * cosPitch * effectiveDistance;
  out.z = player.z + Math.cos(yaw) * cosPitch * effectiveDistance;
  out.y = Math.max(targetY + sinPitch * effectiveDistance, 0.2);
  return out;
}

/** Replace la caméra libre derrière le joueur (on voit son dos, pas sa face). */
function syncFreeCameraFromAim() {
  cameraControl.yaw = aimControl.yaw + Math.PI;
  cameraControl.pitch = THREE.MathUtils.clamp(aimControl.pitch, -0.45, 1.52);
}

/** Reprend la direction vue en caméra libre (centre de l'écran) pour la visée. */
function syncAimFromFreeCamera() {
  const lookY = player.y + 1.3 + tuningState.height;
  computeFreeCameraPosition(_freeCamPos);
  _lookTarget.set(player.x, lookY, player.z);
  _aimDir.copy(_lookTarget).sub(_freeCamPos).normalize();

  aimControl.yaw = Math.atan2(_aimDir.x, _aimDir.z);
  aimControl.pitch = THREE.MathUtils.clamp(
    Math.asin(THREE.MathUtils.clamp(_aimDir.y, -1, 1)),
    -0.32,
    0.48,
  );
}

function getAimDirection(target = _aimDir) {
  _aimEuler.set(aimControl.pitch, aimControl.yaw, 0);
  return target.set(0, 0, 1).applyEuler(_aimEuler).normalize();
}

function getShootDirection(target = _aimDir) {
  return isAiming ? getAimDirection(target) : getModelForward(target);
}

function getModelForward(target = _modelForward) {
  if (scizorMesh) {
    scizorMesh.updateMatrixWorld(true);
    target.set(0, 0, 1).applyQuaternion(scizorMesh.quaternion);
    target.y = 0;
    if (target.lengthSq() > 1e-6) {
      return target.normalize();
    }
  }

  const face = player.angle + modelYawOffset;
  return target.set(Math.sin(face), 0, Math.cos(face));
}

/**
 * @param {object} opts
 * @param {'player' | 'enemy'} opts.owner
 * @param {number} opts.originX
 * @param {number} opts.originY
 * @param {number} opts.originZ
 * @param {number} opts.dirX
 * @param {number} opts.dirY
 * @param {number} opts.dirZ
 * @param {number} [opts.color]
 * @param {number} [opts.emissive]
 * @param {number} [opts.glow]
 * @param {number} [opts.damage]
 */
function spawnLaser(opts) {
  const {
    owner,
    originX,
    originY,
    originZ,
    dirX,
    dirY,
    dirZ,
    color = 0xff2244,
    emissive = 0xff4466,
    glow = 0xff5577,
    damage = LASER_DAMAGE,
  } = opts;

  const forward = _aimDir.set(dirX, dirY, dirZ).normalize();

  const geo = new THREE.BoxGeometry(0.1, 0.1, LASER_LENGTH);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive,
    emissiveIntensity: 2.2,
    roughness: 0.2,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(
    originX + forward.x * 0.5,
    originY + forward.y * 0.5,
    originZ + forward.z * 0.5,
  );
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward);
  mesh.castShadow = false;
  scene.add(mesh);

  const pointLight = new THREE.PointLight(glow, 1.6, 5, 2);
  mesh.add(pointLight);

  lasers.push({
    mesh,
    vx: forward.x * LASER_SPEED,
    vy: forward.y * LASER_SPEED,
    vz: forward.z * LASER_SPEED,
    life: LASER_LIFETIME,
    owner,
    damage,
  });
}

function spawnLaserFromHand() {
  const forward = getShootDirection(_aimDir);
  const handPos = scizorAnimator?.getMuzzleWorldPosition?.(_muzzle);
  const baseY = player.y + tuningState.height;

  const dirX = forward.x;
  const dirY = forward.y;
  const dirZ = forward.z;

  let originX;
  let originY;
  let originZ;

  if (isAiming) {
    const face = player.angle + modelYawOffset;
    const rightX = Math.cos(face);
    const rightZ = -Math.sin(face);
    originX = player.x + rightX * 0.28 + dirX * MUZZLE_FORWARD * 0.55;
    originY = baseY + 1.38 + dirY * MUZZLE_FORWARD * 0.55;
    originZ = player.z + rightZ * 0.28 + dirZ * MUZZLE_FORWARD * 0.55;
  } else {
    originX = player.x + dirX * MUZZLE_FORWARD;
    originY = handPos?.y ?? baseY + 1.25;
    originZ = player.z + dirZ * MUZZLE_FORWARD;
  }

  spawnLaser({
    owner: 'player',
    originX,
    originY,
    originZ,
    dirX,
    dirY,
    dirZ,
  });
}

function updateLasers(dt) {
  const limit = WORLD_SIZE / 2;

  for (let i = lasers.length - 1; i >= 0; i--) {
    const laser = lasers[i];
    laser.life -= dt;
    laser.mesh.position.x += laser.vx * dt;
    laser.mesh.position.y += laser.vy * dt;
    laser.mesh.position.z += laser.vz * dt;

    const { x, z } = laser.mesh.position;
    const outOfBounds = Math.abs(x) > limit || Math.abs(z) > limit;

    if (laser.life <= 0 || outOfBounds) {
      removeLaser(i);
    }
  }

  checkLaserHits();
}

function updateAimCamera() {
  const baseY = player.y + tuningState.height;
  const shoulderY = baseY + 1.4;
  const face = player.angle + modelYawOffset;
  const rightX = Math.cos(face);
  const rightZ = -Math.sin(face);

  _shoulder.set(
    player.x + rightX * 0.34,
    shoulderY,
    player.z + rightZ * 0.34,
  );

  getAimDirection(_aimDir);

  _aimEuler.set(0, aimControl.yaw, 0);
  _camOffset.set(0.2, 0.05, -tuningState.aimDistance).applyEuler(_aimEuler);

  camera.position.copy(_shoulder).add(_camOffset);
  camera.position.y = Math.max(camera.position.y, 0.28);

  _aimLook.copy(_shoulder).addScaledVector(_aimDir, 60);
  camera.lookAt(_aimLook);
  camera.fov = AIM_FOV;
  camera.updateProjectionMatrix();
}

function updateCamera() {
  if (isAiming) {
    updateAimCamera();
    return;
  }

  const targetY = player.y + 1.3 + tuningState.height;
  computeFreeCameraPosition(_freeCamPos);
  camera.position.copy(_freeCamPos);
  camera.lookAt(player.x, targetY, player.z);
  camera.fov = NORMAL_FOV;
  camera.updateProjectionMatrix();
}

function animate() {
  if (!gameRunning) return;
  requestAnimationFrame(animate);
  try {
    const dt = Math.min(clock.getDelta(), 0.05);
    updatePlayer(dt);
    updateScizor(dt);
    if (!combatEnded) {
      updateZoroarkEnemy(dt, player, clock.elapsedTime, spawnLaser);
    } else {
      applyZoroarkTuning();
    }
    updateLasers(dt);
    updateCamera();
    if (hitboxVisuals) {
      updateHitboxVisuals(hitboxVisuals, player, getZoroarkEnemy(), tuningState);
    }
    renderer.render(scene, camera);
  } catch (err) {
    console.error('[Cizayox] frame:', err);
  }
}

export function startGame() {
  try {
    init();
  } catch (err) {
    showFatalError(err, 'initialisation');
    throw err;
  }
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
