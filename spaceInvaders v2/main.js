import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';
import { createShip, updateShipPosition } from './modules/Ship.js';
import { shootBullet, updateBullets } from './modules/Bullet.js';
import { createEnemies, updateEnemies } from './modules/Enemy.js';
import { createEnemyBullet, updateEnemyBullets } from './modules/EnemyBullet.js';
import {checkBulletEnemyCollisions,checkBulletPlayerCollision} from './modules/Collision.js';
import { createExplosion, updateExplosions } from './modules/Explosion.js';
import { resetScore } from './modules/Score.js';



window.onload = () => {
  resetScore(); // <- call inside here instead of top-level
};
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);



const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const light = new THREE.PointLight(0xffffff, 1);
light.position.set(0, 10, -10);
scene.add(light);

// === Ship
const ship = createShip();
scene.add(ship);
ship.userData = {
  score: 0,
  health: 3
};

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, -15); // Behind the ship

// === Bullets
const bullets = [];
const enemyBullets = [];

// === Enemies
const enemies = createEnemies(10);
enemies.forEach(e => scene.add(e));

// === Input
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'Space') {
    const bullet = shootBullet(ship);
    bullets.push(bullet);
    scene.add(bullet);
  }
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// === Game Loop
let lastTime = 0;
function animate(time = 0) {
  requestAnimationFrame(animate);
  const delta = time - lastTime;
  lastTime = time;

  updateShipPosition(ship, keys);
  updateBullets(bullets, scene);
  updateEnemyBullets(enemyBullets, scene);
  updateEnemies(enemies, delta, scene, enemyBullets, createEnemyBullet);
  checkBulletEnemyCollisions(bullets, enemies, scene);
  checkBulletPlayerCollision(enemyBullets, ship, scene);
  updateExplosions(delta, scene);

  // Camera follows ship
  camera.position.set(ship.position.x, 5, ship.position.z - 10);
  camera.lookAt(ship.position.x, 0, ship.position.z + 10);

  // Update HUD with both score and health
  const hud = document.getElementById('hud');
  hud.textContent = `SCORE: ${ship.userData.score} | ❤️ x${ship.userData.health}`;

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
enemies.forEach(enemy => {
  const DEBUG = false;

  if (DEBUG) {
    const helper = new THREE.BoxHelper(enemy, 0xff0000);
    scene.add(helper);
    enemy.userData.helper = helper;
  }
  // 👇 attach helper reference to the enemy

});