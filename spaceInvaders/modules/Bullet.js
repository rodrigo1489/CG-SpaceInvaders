import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';

const bulletSpeed = 0.3;

export function shootBullet(ship) {
  const geometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const bullet = new THREE.Mesh(geometry, material);
  bullet.rotation.x = Math.PI / 2;
  bullet.position.set(ship.position.x, ship.position.y, ship.position.z + 1);
  return bullet;
}

export function updateBullets(bullets, scene) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].position.z += bulletSpeed;
    if (bullets[i].position.z > 50) {
      scene.remove(bullets[i]);
      bullets.splice(i, 1);
    }
  }
}
