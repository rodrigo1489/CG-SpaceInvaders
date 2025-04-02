import * as THREE from 'https://unpkg.com/three@0.155.0/build/three.module.js';

const explosions = [];

export function createExplosion(position, scene, color = 0xff6600, count = 10) {
  const particles = [];

  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.1, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color });
    const particle = new THREE.Mesh(geo, mat);

    // Copy position and give it a random velocity
    particle.position.copy(position);
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      ),
      lifetime: 1 // seconds
    };

    particles.push(particle);
    scene.add(particle);
  }

  explosions.push({ particles, time: 0 });
}

// Call this every frame
export function updateExplosions(delta, scene) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    const { particles, time } = explosions[i];
    const dt = delta / 1000;

    particles.forEach(p => {
      p.position.addScaledVector(p.userData.velocity, dt * 3);
      p.userData.lifetime -= dt;
    });

    // Remove dead particles
    if (particles.every(p => p.userData.lifetime <= 0)) {
      particles.forEach(p => scene.remove(p));
      explosions.splice(i, 1);
    }
  }
}
