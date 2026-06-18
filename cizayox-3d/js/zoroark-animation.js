import * as THREE from '../vendor/three/three.module.js';
import { tuningState } from './tuning-state.js';

/** @type {Record<string, string[]>} */
const BONE_GROUPS = {
  leftShoulder: ['lshoulder'],
  leftArm: ['larm_045'],
  leftForeArm: ['lforearm'],
  rightShoulder: ['rshoulder'],
  rightArm: ['rarm_096'],
  rightForeArm: ['rforearm'],
  neck: ['neck_'],
  maneBase: ['hair01_', 'hair02_', 'hair03_', 'hair04_'],
  maneMid: ['hair05_', 'hair06_', 'hair07_', 'hair08_', 'hair09_'],
  maneTip: ['hair10_', 'hair11_', 'hair12_', 'hair13_', 'hair14_'],
};

/**
 * @param {string} name
 * @param {string[]} patterns
 */
function matchesBone(name, patterns) {
  return patterns.some((p) => name.includes(p));
}

/** @param {THREE.Object3D} root */
export function setupZoroarkAnimation(root) {
  /** @type {THREE.SkinnedMesh[]} */
  const skinnedMeshes = [];

  root.traverse((child) => {
    if (child.isSkinnedMesh) skinnedMeshes.push(child);
  });

  if (skinnedMeshes.length === 0) {
    console.warn('[Cizayox] Zoroark : aucun mesh skinné trouvé');
    return { update: () => {}, boneKeys: Object.keys(BONE_GROUPS), matched: {} };
  }

  /** @type {Record<string, THREE.Bone[]>} */
  const boneGroups = {};
  Object.keys(BONE_GROUPS).forEach((key) => {
    boneGroups[key] = [];
  });

  const seen = new Set();
  skinnedMeshes.forEach((mesh) => {
    mesh.skeleton?.bones.forEach((bone) => {
      const name = bone.name.toLowerCase();
      const uid = `${bone.name}#${bone.uuid}`;
      if (seen.has(uid)) return;
      seen.add(uid);

      Object.entries(BONE_GROUPS).forEach(([key, patterns]) => {
        if (matchesBone(name, patterns)) {
          boneGroups[key].push(bone);
        }
      });
    });
  });

  /** @type {Record<string, THREE.Euler>} */
  const rest = {};
  Object.entries(boneGroups).forEach(([key, list]) => {
    if (list[0]) rest[key] = list[0].rotation.clone();
  });

  const matched = Object.fromEntries(
    Object.entries(boneGroups).map(([key, list]) => [key, list.length]),
  );
  console.info('[Cizayox] Zoroark os détectés:', matched);

  function applyBoneOffsets() {
    const offsets = tuningState.zoroarkBones;
    let changed = false;

    Object.entries(boneGroups).forEach(([key, list]) => {
      const base = rest[key];
      const off = offsets[key];
      if (!base || !off || list.length === 0) return;

      list.forEach((bone) => {
        bone.rotation.set(
          base.x + (off.x || 0),
          base.y + (off.y || 0),
          base.z + (off.z || 0),
        );
      });
      changed = true;
    });

    if (changed) {
      skinnedMeshes.forEach((mesh) => mesh.skeleton?.update());
    }
  }

  return {
    boneKeys: Object.keys(BONE_GROUPS),
    matched,
    update() {
      applyBoneOffsets();
    },
  };
}
