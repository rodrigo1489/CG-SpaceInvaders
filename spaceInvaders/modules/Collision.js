import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';

export function checkBulletEnemyCollisions(bullets, enemies, scene) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    const bulletBox = new THREE.Box3().setFromObject(bullet);

    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      const enemyBox = new THREE.Box3().setFromObject(enemy);

      if (bulletBox.intersectsBox(enemyBox)) {
        // 💥 HIT!
        scene.remove(bullet);
        bullets.splice(i, 1);

        scene.remove(enemy);
        enemies.splice(j, 1);

        break; // Stop checking this bullet
      }
    }
  }
}

export function checkBulletPlayerCollision(enemyBullets, ship, scene) {
    const shipBox = new THREE.Box3().setFromObject(ship);
  
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
      const bullet = enemyBullets[i];
      const bulletBox = new THREE.Box3().setFromObject(bullet);
  
      if (bulletBox.intersectsBox(shipBox)) {
        scene.remove(bullet);
        enemyBullets.splice(i, 1);
  
        ship.userData.health--;
        console.log(`💥 Player hit! Health: ${ship.userData.health}`);
  
        if (ship.userData.health <= 0) {
          console.log('%c💀 GAME OVER', 'color: red; font-weight: bold; font-size: 18px');
          scene.remove(ship);
  
          // Optional: stop the game loop
          // cancelAnimationFrame(animationFrameId);
        }
  
        break;
      }
    }
  }