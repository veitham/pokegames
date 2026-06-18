import * as THREE from '../vendor/three/three.module.js';
import { tuningState, LEFT_TO_BONE_ID, computeRightOffset } from './tuning-state.js';

const LEFT_RIGHT_PAIRS = [
  ['leftShoulder1', 'rightShoulder1'],
  ['leftShoulder2', 'rightShoulder2'],
  ['leftArm1', 'rightArm1'],
  ['leftArm2', 'rightArm2'],
];

/** Pose de tir — bras droit (pince) levé vers l'avant. */
const SHOOT_POSE = {
  rightShoulder1: { x: -0.55, y: 0.12, z: 0.35 },
  rightShoulder2: { x: 0.18, y: -0.08, z: 0.22 },
  rightArm1: { x: 0.72, y: -0.05, z: -0.12 },
  rightArm2: { x: -0.35, y: 0.08, z: 0.15 },
};

const _muzzlePos = new THREE.Vector3();
const _muzzleDir = new THREE.Vector3();
const _boneWorldQuat = new THREE.Quaternion();

/** @param {THREE.Object3D} root */
export function setupScizorAnimation(root) {
  /** @type {THREE.SkinnedMesh | null} */
  let skinnedMesh = null;
  /** @type {Record<string, THREE.Bone>} */
  const bones = {};

  root.traverse((child) => {
    if (child.isSkinnedMesh && !skinnedMesh) {
      skinnedMesh = child;
    }
  });

  if (!skinnedMesh?.skeleton) {
    return {
      update: () => {},
      triggerShoot: () => {},
      getMuzzleWorldPosition: () => null,
      getShootDirection: () => null,
    };
  }

  skinnedMesh.skeleton.bones.forEach((bone) => {
    const name = bone.name.toLowerCase();
    if (name.includes('left_shoulder_01')) bones.leftShoulder1 = bone;
    if (name.includes('left_shoulder_02')) bones.leftShoulder2 = bone;
    if (name.includes('left_arm_01')) bones.leftArm1 = bone;
    if (name.includes('left_arm_02')) bones.leftArm2 = bone;
    if (name.includes('right_shoulder_01')) bones.rightShoulder1 = bone;
    if (name.includes('right_shoulder_02')) bones.rightShoulder2 = bone;
    if (name.includes('right_arm_01')) bones.rightArm1 = bone;
    if (name.includes('right_arm_02')) bones.rightArm2 = bone;
    if (name.includes('left_leg_01')) bones.leftLeg1 = bone;
    if (name.includes('left_leg_02')) bones.leftLeg2 = bone;
    if (name.includes('right_leg_01')) bones.rightLeg1 = bone;
    if (name.includes('right_leg_02')) bones.rightLeg2 = bone;
    if (name.includes('spine_')) bones.spine = bone;
  });

  /** @type {Record<string, THREE.Euler>} */
  const rest = {};
  Object.entries(bones).forEach(([key, bone]) => {
    rest[key] = bone.rotation.clone();
  });

  let shootBlend = 0;

  function setBone(key, offsets) {
    const bone = bones[key];
    const base = rest[key];
    if (!bone || !base) return;
    bone.rotation.set(
      base.x + (offsets.x || 0),
      base.y + (offsets.y || 0),
      base.z + (offsets.z || 0),
    );
  }

  function getRightOffsets(leftKey, leftRot) {
    const boneId = LEFT_TO_BONE_ID[leftKey];
    const leftRest = rest[leftKey];
    const rightRest = rest[leftKey.replace('left', 'right')];
    if (!boneId || !leftRest || !rightRest) return leftRot;

    return computeRightOffset(
      leftRot,
      { x: leftRest.x, y: leftRest.y, z: leftRest.z },
      { x: rightRest.x, y: rightRest.y, z: rightRest.z },
      tuningState.boneMirror[boneId],
      tuningState.mirrorMode,
      tuningState.rightExtra[boneId],
    );
  }

  function applyShootPose() {
    if (shootBlend <= 0.001) return;

    Object.entries(SHOOT_POSE).forEach(([key, pose]) => {
      const bone = bones[key];
      if (!bone) return;
      bone.rotation.x += pose.x * shootBlend;
      bone.rotation.y += pose.y * shootBlend;
      bone.rotation.z += pose.z * shootBlend;
    });
  }

  return {
    triggerShoot() {
      shootBlend = 1;
    },

    /** @param {THREE.Vector3} [target] */
    getMuzzleWorldPosition(target) {
      const handBone = bones.rightArm2 || bones.rightArm1;
      if (!handBone || !skinnedMesh) return null;

      skinnedMesh.updateMatrixWorld(true);
      handBone.getWorldPosition(_muzzlePos);
      handBone.getWorldQuaternion(_boneWorldQuat);
      _muzzleDir.set(0, 0, 0.45).applyQuaternion(_boneWorldQuat);
      _muzzlePos.add(_muzzleDir);

      return target ? target.copy(_muzzlePos) : _muzzlePos.clone();
    },

    /** @param {THREE.Vector3} [target] */
    getShootDirection(target) {
      const handBone = bones.rightArm2 || bones.rightArm1;
      if (!handBone || !skinnedMesh) return null;

      handBone.getWorldQuaternion(_boneWorldQuat);
      _muzzleDir.set(0, 0, 1).applyQuaternion(_boneWorldQuat).normalize();
      return target ? target.copy(_muzzleDir) : _muzzleDir.clone();
    },

    /** @param {number} speed @param {number} time @param {number} [dt] */
    update(speed, time, dt = 0.016) {
      const moveBlend = tuningState.animateWalk
        ? THREE.MathUtils.clamp(speed / 7.5, 0, 1)
        : 0;
      const walkPhase = time * (8 + moveBlend * 4);
      const swing = Math.sin(walkPhase) * tuningState.armSwing * moveBlend * (1 - shootBlend * 0.85);
      const legSwing = Math.sin(walkPhase) * 0.42 * moveBlend;
      const idleSway = Math.sin(time * 1.5) * 0.03;

      LEFT_RIGHT_PAIRS.forEach(([leftKey, rightKey]) => {
        const leftRot = tuningState[leftKey];
        const rightRot = getRightOffsets(leftKey, leftRot);

        const leftExtra = leftKey === 'leftShoulder1'
          ? { x: swing }
          : leftKey === 'leftArm2'
            ? { x: Math.abs(swing) * 0.12 }
            : {};

        const rightExtra = rightKey === 'rightShoulder1'
          ? { x: -swing }
          : rightKey === 'rightArm2'
            ? { x: Math.abs(swing) * 0.12 }
            : {};

        setBone(leftKey, {
          x: leftRot.x + (leftExtra.x || 0),
          y: leftRot.y + (leftExtra.y || 0),
          z: leftRot.z + (leftExtra.z || 0),
        });

        setBone(rightKey, {
          x: rightRot.x + (rightExtra.x || 0),
          y: rightRot.y + (rightExtra.y || 0),
          z: rightRot.z + (rightExtra.z || 0),
        });
      });

      applyShootPose();

      setBone('leftLeg1', { x: legSwing });
      setBone('leftLeg2', { x: Math.max(0, legSwing) * 0.55 });
      setBone('rightLeg1', { x: -legSwing });
      setBone('rightLeg2', { x: Math.max(0, -legSwing) * 0.55 });
      setBone('spine', {
        x: idleSway + moveBlend * 0.04 - shootBlend * 0.06,
        y: Math.sin(walkPhase * 0.5) * 0.03 * moveBlend,
      });

      skinnedMesh.skeleton.update();

      if (shootBlend > 0) {
        shootBlend = Math.max(0, shootBlend - dt * 3.8);
      }
    },
  };
}
