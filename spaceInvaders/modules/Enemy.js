import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';

export function createEnemies(count = 10) {
  const enemies = [];

  for (let i = 0; i < count; i++) {
    const enemy = buildEnemyMesh();
    const spacing = 2;
    enemy.position.x = (i - count / 2) * spacing;
    enemy.position.y = 0;
    enemy.position.z = 5;
    enemy.userData = {
      direction: 1,
      cooldown: Math.random() * 1500 + 1500,
      timeSinceLastShot: 0
    };
    enemies.push(enemy);
  }

  return enemies;
}

function buildEnemyMesh() {
  const group = new THREE.Group();

  const body = new THREE.BoxGeometry(1, 1, 0.5);
  const material = new THREE.MeshStandardMaterial({ color: 0xff33cc });
  const center = new THREE.Mesh(body, material);
  group.add(center);

  const eye = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const leftEye = new THREE.Mesh(eye, white);
  const rightEye = new THREE.Mesh(eye, white);
  leftEye.position.set(-0.3, 0.2, 0.3);
  rightEye.position.set(0.3, 0.2, 0.3);
  group.add(leftEye, rightEye);

  return group;
}

export function updateEnemies(enemies, delta, scene, enemyBullets, shootCallback) {
  enemies.forEach((enemy) => {
    enemy.position.x += 0.05 * enemy.userData.direction;

    if (Math.abs(enemy.position.x) > 8) {
      enemy.userData.direction *= -1;
      enemy.position.z -= 1; // move toward player on bounce
    }

    enemy.userData.timeSinceLastShot += delta;
    if (enemy.userData.timeSinceLastShot > enemy.userData.cooldown) {
      const bullet = shootCallback(enemy);
      if (bullet) {
        scene.add(bullet);
        enemyBullets.push(bullet);
      }
      enemy.userData.timeSinceLastShot = 0;
    }
  });
}
