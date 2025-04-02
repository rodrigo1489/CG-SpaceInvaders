import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';

const speed = 0.1;

export function createEnemyBullet(enemy) {
  const geometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
  const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const bullet = new THREE.Mesh(geometry, material);
  bullet.rotation.x = Math.PI / 2;
  bullet.position.set(enemy.position.x, enemy.position.y, enemy.position.z - 1);
  return bullet;
}

export function updateEnemyBullets(bullets, scene) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].position.z -= speed;
    if (bullets[i].position.z < -20) {
      scene.remove(bullets[i]);
      bullets.splice(i, 1);
    }
  }
}
