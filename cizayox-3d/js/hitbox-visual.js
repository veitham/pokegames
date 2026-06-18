import * as THREE from '../vendor/three/three.module.js';

/**
 * @param {THREE.Scene} scene
 * @param {number} color
 */
function createWireSphere(scene, color) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 18, 12),
    new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    }),
  );
  mesh.visible = false;
  scene.add(mesh);
  return mesh;
}

/** @param {THREE.Scene} scene */
export function initHitboxVisuals(scene) {
  return {
    player: createWireSphere(scene, 0x44ff88),
    enemy: createWireSphere(scene, 0xbb66ff),
  };
}

/**
 * @param {ReturnType<typeof initHitboxVisuals>} visuals
 * @param {{ x: number, y: number, hitRadius: number }} player
 * @param {{ x: number, y: number, alive: boolean, hitRadius: number } | null} enemy
 * @param {{ showHitboxes: boolean, playerHitRadius: number, playerHitCenterY: number, zoroarkHitRadius: number, zoroarkHitCenterY: number, height: number }} tuning
 */
export function updateHitboxVisuals(visuals, player, enemy, tuning) {
  const show = tuning.showHitboxes;

  visuals.player.visible = show;
  visuals.enemy.visible = show && Boolean(enemy?.alive);

  if (!show) return;

  const playerY = player.y + tuning.height + tuning.playerHitCenterY;
  visuals.player.position.set(player.x, playerY, player.z);
  visuals.player.scale.setScalar(tuning.playerHitRadius);

  if (enemy?.alive) {
    const enemyY = enemy.y + tuning.zoroarkHitCenterY;
    visuals.enemy.position.set(enemy.x, enemyY, enemy.z);
    visuals.enemy.scale.setScalar(tuning.zoroarkHitRadius);
  }
}
