import * as THREE from '../vendor/three/three.module.js';

/** @returns {THREE.Group} */
export function buildProceduralScizor() {
  const scizor = new THREE.Group();

  const red = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    metalness: 0.55,
    roughness: 0.38,
    flatShading: true,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    metalness: 0.35,
    roughness: 0.5,
    flatShading: true,
  });
  const silver = new THREE.MeshStandardMaterial({
    color: 0xc8d2dc,
    metalness: 0.7,
    roughness: 0.28,
    flatShading: true,
  });
  const cream = new THREE.MeshStandardMaterial({
    color: 0xf5e6c8,
    metalness: 0.15,
    roughness: 0.65,
    flatShading: true,
  });

  function part(geometry, material, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scizor.add(mesh);
    return mesh;
  }

  // Torse
  part(new THREE.BoxGeometry(1.1, 1.35, 0.75), red, 0, 1.15, 0, 0, 0, 0, 1, 1, 1);
  part(new THREE.BoxGeometry(0.95, 0.45, 0.65), cream, 0, 1.55, 0.05);

  // Tête
  part(new THREE.SphereGeometry(0.42, 8, 6), red, 0, 2.05, 0.12);
  part(new THREE.BoxGeometry(0.55, 0.18, 0.35), cream, 0, 2.02, 0.38);
  part(new THREE.SphereGeometry(0.09, 6, 6), dark, -0.14, 2.12, 0.42);
  part(new THREE.SphereGeometry(0.09, 6, 6), dark, 0.14, 2.12, 0.42);

  // Ailes / carapace
  part(new THREE.BoxGeometry(0.35, 0.9, 0.55), silver, -0.62, 1.35, -0.18, 0, 0, 0.35);
  part(new THREE.BoxGeometry(0.35, 0.9, 0.55), silver, 0.62, 1.35, -0.18, 0, 0, -0.35);

  // Bras gauche + pince
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.72, 1.45, 0.1);
  leftArm.rotation.z = 0.45;
  scizor.add(leftArm);

  const upperArmL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.75, 0.3), red);
  upperArmL.position.y = -0.28;
  upperArmL.castShadow = true;
  leftArm.add(upperArmL);

  const clawL = new THREE.Group();
  clawL.position.set(-0.05, -0.72, 0.15);
  clawL.rotation.z = -0.2;
  leftArm.add(clawL);

  const clawBaseL = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.35, 0.45), silver);
  clawBaseL.castShadow = true;
  clawL.add(clawBaseL);

  const clawTopL = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.14, 0.38), silver);
  clawTopL.position.set(0.12, 0.18, 0);
  clawTopL.rotation.z = -0.35;
  clawTopL.castShadow = true;
  clawL.add(clawTopL);

  const clawBotL = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.34), silver);
  clawBotL.position.set(0.1, -0.16, 0);
  clawBotL.rotation.z = 0.3;
  clawBotL.castShadow = true;
  clawL.add(clawBotL);

  // Bras droit + pince (miroir)
  const rightArm = new THREE.Group();
  rightArm.position.set(0.72, 1.45, 0.1);
  rightArm.rotation.z = -0.45;
  scizor.add(rightArm);

  const upperArmR = upperArmL.clone();
  upperArmR.position.y = -0.28;
  rightArm.add(upperArmR);

  const clawR = new THREE.Group();
  clawR.position.set(0.05, -0.72, 0.15);
  clawR.rotation.z = 0.2;
  rightArm.add(clawR);

  const clawBaseR = clawBaseL.clone();
  clawR.add(clawBaseR);

  const clawTopR = clawTopL.clone();
  clawTopR.position.set(-0.12, 0.18, 0);
  clawTopR.rotation.z = 0.35;
  clawR.add(clawTopR);

  const clawBotR = clawBotL.clone();
  clawBotR.position.set(-0.1, -0.16, 0);
  clawBotR.rotation.z = -0.3;
  clawR.add(clawBotR);

  // Jambes
  part(new THREE.BoxGeometry(0.28, 0.65, 0.32), dark, -0.28, 0.42, 0.05);
  part(new THREE.BoxGeometry(0.28, 0.65, 0.32), dark, 0.28, 0.42, 0.05);
  part(new THREE.BoxGeometry(0.34, 0.18, 0.42), dark, -0.28, 0.08, 0.08);
  part(new THREE.BoxGeometry(0.34, 0.18, 0.42), dark, 0.28, 0.08, 0.08);

  // Abdomen
  part(new THREE.SphereGeometry(0.38, 7, 5), cream, 0, 0.62, -0.05, 0.2, 0, 0, 1, 0.85, 0.9);

  scizor.scale.setScalar(0.95);
  return scizor;
}
