import * as THREE from '../vendor/three/three.module.js';

/** @typedef {{ x: number, y: number, z: number }} Rot */

/** @typedef {'component' | 'quat-sagittal' | 'quat-neg-yz' | 'quat-neg-xy'} MirrorMode */

/** @type {Record<string, string>} */
export const LEFT_TO_BONE_ID = {
  leftShoulder1: 'shoulder1',
  leftShoulder2: 'shoulder2',
  leftArm1: 'arm1',
  leftArm2: 'arm2',
};

const defaultMirror = { x: 1, y: -1, z: -1 };
const zeroRot = { x: 0, y: 0, z: 0 };

/** Configuration validée — miroir quaternion sagittal depuis le bras gauche. */
/** @type {{
  height: number,
  animateWalk: boolean,
  armSwing: number,
  mirrorMode: MirrorMode,
  boneMirror: Record<string, Rot>,
  rightExtra: Record<string, Rot>,
  leftShoulder1: Rot,
  leftShoulder2: Rot,
  leftArm1: Rot,
  leftArm2: Rot,
}} */
export const tuningState = {
  height: -0.14,
  /** Distance caméra épaule en mode visée (plus grand = plus dézoomé). */
  aimDistance: 0.88,
  /** Multiplicateur de taille du modèle Zoroark. */
  zoroarkScale: 0.14,
  zoroarkBones: {
    leftShoulder: { x: 0, y: 0, z: 0 },
    leftArm: { x: 0, y: 0, z: 0 },
    leftForeArm: { x: 0, y: 0, z: 0 },
    rightShoulder: { x: 0, y: 0, z: 0 },
    rightArm: { x: 0, y: 0, z: 0 },
    rightForeArm: { x: 0, y: 0, z: 0 },
    neck: { x: 0, y: 0, z: 0 },
    maneBase: { x: 0, y: 0, z: 0 },
    maneMid: { x: 0, y: 0, z: 0 },
    maneTip: { x: 0, y: 0, z: 0 },
  },
  zoroarkHitRadius: 0.95,
  zoroarkHitCenterY: 1.25,
  playerHitRadius: 0.85,
  playerHitCenterY: 1.2,
  showHitboxes: true,
  animateWalk: true,
  armSwing: 0.36,
  mirrorMode: 'quat-sagittal',
  boneMirror: {
    shoulder1: { ...defaultMirror },
    shoulder2: { ...defaultMirror },
    arm1: { ...defaultMirror },
    arm2: { ...defaultMirror },
  },
  rightExtra: {
    shoulder1: { ...zeroRot },
    shoulder2: { ...zeroRot },
    arm1: { ...zeroRot },
    arm2: { ...zeroRot },
  },
  leftShoulder1: { x: 0.58, y: 0.86, z: -0.34 },
  leftShoulder2: { x: 0.32, y: -0.27, z: 0.98 },
  leftArm1: { x: 0.04, y: -0.46, z: -0.34 },
  leftArm2: { x: -1.09, y: -0.18, z: 0.76 },
};

const _euler = new THREE.Euler();
const _qLeft = new THREE.Quaternion();
const _qRight = new THREE.Quaternion();
const _qLeftRest = new THREE.Quaternion();
const _qRightRest = new THREE.Quaternion();
const _qDelta = new THREE.Quaternion();
const _qMirrored = new THREE.Quaternion();

function mirrorRotation(left, mirror) {
  return {
    x: left.x * mirror.x,
    y: left.y * mirror.y,
    z: left.z * mirror.z,
  };
}

/**
 * @param {THREE.Quaternion} qIn
 * @param {Rot} boneMirror
 * @param {MirrorMode} mode
 * @returns {THREE.Quaternion}
 */
function mirrorQuaternionDelta(qIn, boneMirror, mode) {
  const { x, y, z, w } = qIn;
  switch (mode) {
    case 'quat-sagittal':
      _qMirrored.set(-x * boneMirror.x, y * boneMirror.y, -z * boneMirror.z, w);
      break;
    case 'quat-neg-yz':
      _qMirrored.set(x * boneMirror.x, -y * boneMirror.y, -z * boneMirror.z, w);
      break;
    case 'quat-neg-xy':
      _qMirrored.set(-x * boneMirror.x, -y * boneMirror.y, z * boneMirror.z, w);
      break;
    default:
      _qMirrored.copy(qIn);
  }
  return _qMirrored.normalize();
}

/**
 * @param {Rot} leftOffsets
 * @param {Rot} leftRest
 * @param {Rot} rightRest
 * @param {Rot} boneMirror
 * @param {MirrorMode} mode
 * @param {Rot} [extra]
 */
export function computeRightOffset(leftOffsets, leftRest, rightRest, boneMirror, mode, extra = zeroRot) {
  if (mode === 'component') {
    const mirrored = mirrorRotation(leftOffsets, boneMirror);
    return {
      x: mirrored.x + extra.x,
      y: mirrored.y + extra.y,
      z: mirrored.z + extra.z,
    };
  }

  _euler.set(
    leftRest.x + leftOffsets.x,
    leftRest.y + leftOffsets.y,
    leftRest.z + leftOffsets.z,
    'XYZ',
  );
  _qLeft.setFromEuler(_euler);
  _qLeftRest.setFromEuler(_euler.set(leftRest.x, leftRest.y, leftRest.z, 'XYZ'));
  _qDelta.copy(_qLeftRest).invert().multiply(_qLeft);

  mirrorQuaternionDelta(_qDelta, boneMirror, mode);

  _qRightRest.setFromEuler(_euler.set(rightRest.x, rightRest.y, rightRest.z, 'XYZ'));
  _qRight.copy(_qRightRest).multiply(_qMirrored);
  _euler.setFromQuaternion(_qRight, 'XYZ');

  return {
    x: _euler.x - rightRest.x + extra.x,
    y: _euler.y - rightRest.y + extra.y,
    z: _euler.z - rightRest.z + extra.z,
  };
}
