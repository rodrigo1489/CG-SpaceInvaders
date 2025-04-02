import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';
import { createExplosion } from './Explosion.js'; 
import { increaseScore } from './Score.js'; 

export function checkBulletEnemyCollisions(bullets, enemies, scene) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    const bulletBox = new THREE.Box3().setFromObject(bullet);

    for (let j = enemies.length - 1; j >= 0; j--) {
      const enemy = enemies[j];
      const enemyBox = new THREE.Box3().setFromObject(enemy);

      if (bulletBox.intersectsBox(enemyBox)) {
        // 💥 Remove bullet
        scene.remove(bullet);
        bullets.splice(i, 1);

        // 🔻 Subtract health
        enemy.userData.health--;

        if (enemy.userData.health <= 0) {
          createExplosion(enemy.position, scene, 0xff33cc);

          // Update the score
          const scoreIncrease = 100; // Points for destroying an enemy
          increaseScore(scoreIncrease); // Call the function to increase the score
          console.log(`✅ Score increased by ${scoreIncrease}`);

          // Remove the debug helper if it exists
          if (enemy.userData.helper) {
            scene.remove(enemy.userData.helper);
          }

          // 👇 Remove enemy from scene and array
          scene.remove(enemy);
          enemies.splice(j, 1);
        }

        break;
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
          createExplosion(ship.position, scene, 0x00ffff);
          scene.remove(ship);
          console.log('%c💀 GAME OVER', 'color: red; font-weight: bold; font-size: 18px');
        }
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