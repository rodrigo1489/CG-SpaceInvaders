import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';

export function createShip() {
  const geometry = new THREE.BoxGeometry(1, 0.5, 1.5);
  const material = new THREE.MeshStandardMaterial({ color: 0x00ffff });
  const ship = new THREE.Mesh(geometry, material);
  ship.position.set(0, 0, -5); // starting point
  return ship;
}

export function updateShipPosition(ship, keys) {
  const speed = 0.2;

  if (keys['ArrowLeft'] || keys['KeyD']) ship.position.x -= speed;
  if (keys['ArrowRight'] || keys['KeyA']) ship.position.x += speed;

  // Clamp
  ship.position.x = THREE.MathUtils.clamp(ship.position.x, -8, 8);
  ship.position.y = 0;



}
