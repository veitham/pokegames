import * as THREE from '../vendor/three/three.module.js';
import { GLTFLoader } from '../vendor/three/addons/loaders/GLTFLoader.js';
import { tuningState } from './tuning-state.js';
import { setupZoroarkAnimation } from './zoroark-animation.js';

const ZOROARK_PATH = new URL('../models/zoroark.glb', import.meta.url).href;

const ENEMY_MAX_HP = 100;
const ENEMY_SPEED = 5;
const ENEMY_SHOOT_RANGE = 24;
const ENEMY_SHOOT_COOLDOWN = 0.95;
const ENEMY_LASER_DAMAGE = 12;
const MUZZLE_FORWARD = 1.0;

/** @type {{
 *  mesh: THREE.Object3D | null,
 *  baseScale: number,
 *  x: number, z: number, y: number,
 *  vx: number, vz: number,
 *  angle: number,
 *  hp: number, maxHp: number,
 *  hitRadius: number,
 *  alive: boolean,
 *  lastShoot: number,
 *  strafeDir: number,
 *  strafeTimer: number,
 *  animator: { update: () => void } | null,
 *  isTerrainBlocked: (x: number, z: number, radius?: number) => boolean,
 * } | null} */
let enemy = null;

const _aim = new THREE.Vector3();

/**
 * @param {(x: number, z: number, radius?: number) => boolean} isTerrainBlocked
 */
function findClearSpawn(isTerrainBlocked) {
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * 16;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (Math.hypot(x, z) > 10 && !isTerrainBlocked(x, z, 0.8)) {
      return { x, z };
    }
  }
  return { x: 22, z: 18 };
}

/**
 * @param {object} opts
 * @param {THREE.Scene} opts.scene
 * @param {(x: number, z: number, radius?: number) => boolean} opts.isTerrainBlocked
 * @param {() => void} [opts.onReady]
 */
export function initZoroarkEnemy({ scene, isTerrainBlocked, onReady }) {
  const loader = new GLTFLoader();
  loader.load(
    ZOROARK_PATH,
    (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) child.material.side = THREE.DoubleSide;
        }
      });

      const targetHeight = 2.75;
      let box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const baseScale = targetHeight / Math.max(size.y, size.x, size.z, 0.001);

      box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      model.position.sub(center);
      box = new THREE.Box3().setFromObject(model);
      model.position.y -= box.min.y;

      const { x: spawnX, z: spawnZ } = findClearSpawn(isTerrainBlocked);

      scene.add(model);

      enemy = {
        mesh: model,
        baseScale,
        x: spawnX,
        z: spawnZ,
        y: getGroundY(),
        vx: 0,
        vz: 0,
        angle: Math.PI,
        hp: ENEMY_MAX_HP,
        maxHp: ENEMY_MAX_HP,
        hitRadius: tuningState.zoroarkHitRadius,
        alive: true,
        lastShoot: -2,
        strafeDir: 1,
        strafeTimer: 0,
        isTerrainBlocked,
        animator: setupZoroarkAnimation(model),
      };

      applyZoroarkTuning();
      onReady?.();
    },
    undefined,
    (err) => console.warn('[Cizayox] Zoroark introuvable:', err),
  );
}

function getGroundY() {
  return 0;
}

/** Applique taille + squelette depuis les réglages (toujours actif). */
export function applyZoroarkTuning() {
  if (!enemy?.mesh) return;

  enemy.mesh.position.set(enemy.x, enemy.y, enemy.z);
  enemy.mesh.rotation.order = 'YXZ';
  enemy.mesh.rotation.y = enemy.angle;
  enemy.mesh.scale.setScalar(enemy.baseScale * tuningState.zoroarkScale);
  enemy.hitRadius = tuningState.zoroarkHitRadius;

  try {
    enemy.animator?.update();
  } catch (err) {
    console.error('[Cizayox] Zoroark tuning:', err);
  }
}

/** @returns {typeof enemy} */
export function getZoroarkEnemy() {
  return enemy;
}

export function damageZoroark(amount) {
  if (!enemy?.alive) return;
  enemy.hp = Math.max(0, enemy.hp - amount);
  if (enemy.hp <= 0) {
    enemy.alive = false;
    enemy.vx = 0;
    enemy.vz = 0;
    if (enemy.mesh) {
      enemy.mesh.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true;
          child.material.opacity = 0.35;
        }
      });
    }
  }
}

/**
 * @param {number} dt
 * @param {{ x: number, z: number, y: number, hp: number, hitRadius: number }} player
 * @param {number} time
 * @param {(opts: object) => void} spawnLaser
 */
export function updateZoroarkEnemy(dt, player, time, spawnLaser) {
  if (!enemy?.mesh || !enemy.alive) return;

  const dx = player.x - enemy.x;
  const dz = player.z - enemy.z;
  const dist = Math.hypot(dx, dz);

  enemy.strafeTimer -= dt;
  if (enemy.strafeTimer <= 0) {
    enemy.strafeDir = Math.random() > 0.5 ? 1 : -1;
    enemy.strafeTimer = 1.8 + Math.random() * 2.2;
  }

  enemy.angle = Math.atan2(dx, dz);

  let moveX = 0;
  let moveZ = 0;

  if (dist > 16) {
    moveX = dx / dist;
    moveZ = dz / dist;
  } else if (dist > 7) {
    const perpX = -dz / dist;
    const perpZ = dx / dist;
    moveX = perpX * enemy.strafeDir * 0.65 + (dx / dist) * 0.35;
    moveZ = perpZ * enemy.strafeDir * 0.65 + (dz / dist) * 0.35;
  } else if (dist < 5) {
    moveX = -dx / dist;
    moveZ = -dz / dist;
  } else {
    const perpX = -dz / dist;
    const perpZ = dx / dist;
    moveX = perpX * enemy.strafeDir;
    moveZ = perpZ * enemy.strafeDir;
  }

  const len = Math.hypot(moveX, moveZ);
  if (len > 0) {
    moveX /= len;
    moveZ /= len;
    enemy.vx = moveX * ENEMY_SPEED;
    enemy.vz = moveZ * ENEMY_SPEED;
  } else {
    enemy.vx = 0;
    enemy.vz = 0;
  }

  const nextX = enemy.x + enemy.vx * dt;
  const nextZ = enemy.z + enemy.vz * dt;
  const moveRadius = 0.55;

  const blocked = (x, z) => {
    if (enemy.isTerrainBlocked(x, z, moveRadius)) return true;
    return Math.hypot(x - player.x, z - player.z) < enemy.hitRadius + player.hitRadius;
  };

  if (!blocked(nextX, enemy.z)) enemy.x = nextX;
  else enemy.vx = 0;

  if (!blocked(enemy.x, nextZ)) enemy.z = nextZ;
  else enemy.vz = 0;

  enemy.y = getGroundY();
  applyZoroarkTuning();

  if (dist < ENEMY_SHOOT_RANGE && player.hp > 0 && time - enemy.lastShoot >= ENEMY_SHOOT_COOLDOWN) {
    enemy.lastShoot = time;
    shootAtPlayer(player, spawnLaser);
  }
}

/**
 * @param {{ x: number, z: number, y: number }} player
 * @param {(opts: object) => void} spawnLaser
 */
function shootAtPlayer(player, spawnLaser) {
  if (!enemy) return;

  const chestY = player.y + tuningState.playerHitCenterY;
  _aim.set(player.x - enemy.x, chestY - (enemy.y + 1.35), player.z - enemy.z).normalize();

  const originX = enemy.x + _aim.x * MUZZLE_FORWARD;
  const originY = enemy.y + 1.35 + _aim.y * MUZZLE_FORWARD * 0.3;
  const originZ = enemy.z + _aim.z * MUZZLE_FORWARD;

  spawnLaser({
    owner: 'enemy',
    originX,
    originY,
    originZ,
    dirX: _aim.x,
    dirY: _aim.y,
    dirZ: _aim.z,
    color: 0x6633cc,
    emissive: 0x9955ff,
    glow: 0xaa66ff,
    damage: ENEMY_LASER_DAMAGE,
  });
}

export function getZoroarkHitCenter() {
  if (!enemy) return null;
  return { x: enemy.x, y: enemy.y + tuningState.zoroarkHitCenterY, z: enemy.z };
}

export function getZoroarkHitRadius() {
  return tuningState.zoroarkHitRadius;
}

export function isZoroarkAlive() {
  return Boolean(enemy?.alive);
}
