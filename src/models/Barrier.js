import * as THREE from "/node_modules/three/build/three.module.js";
import { VoxelModel } from "../utils/VoxelModel.js";
import { COLORS } from "../utils/constants.js";

export class Barrier {
  constructor(scene, position) {
    this.scene = scene;
    this.position = position;
    this.health = 100; // Add health to barrier
    this.isDestroyed = false;
    this.createModel();
  }

  createModel() {
    const model = new VoxelModel();

    // Barrier design - wider gap between pillars
    const bottomLayer = [
      [1, 1, 0, 0, 0, 0, 1, 1], // Wider gap between supports (4 blocks)
    ];

    const topLayer = [
      [1, 1, 1, 1, 1, 1, 1, 1], // Full width top
    ];

    // Build the barrier: bottom supports and solid top with barrier texture
    for (let i = 0; i < 1; i++) {
      // Make it 3 blocks deep
      // Bottom layers with gap
      model.addLayer(bottomLayer, 0, COLORS.BARRIER, i, "barrier");
      model.addLayer(bottomLayer, 1, COLORS.BARRIER, i, "barrier");
      model.addLayer(bottomLayer, 2, COLORS.BARRIER, i, "barrier");
      model.addLayer(topLayer, 3, COLORS.BARRIER, i, "barrier");
      model.addLayer(topLayer, 4, COLORS.BARRIER, i, "barrier");
    }

    this.model = model.getModel();

    // Position barrier
    this.model.position.set(
      this.position.x,
      -4, // Lower position to match camera angle
      0 // Same z-axis as other objects
    );

    // Store pillar centers for collision detection - more accurately positioned
    this.leftPillarPos = new THREE.Vector3(
      this.position.x - 1.6, // Left pillar x-position
      -3.4, // Lower part of barrier
      0 // Same z-axis
    );

    this.rightPillarPos = new THREE.Vector3(
      this.position.x + 1.3, // Right pillar x-position
      -3.4, // Lower part of barrier
      0 // Same z-axis
    );

    // Store top section position for collision detection
    this.topPos = new THREE.Vector3(
      this.position.x, // Center x-position
      -2.5, // Top part of barrier
      0 // Same z-axis
    );

    this.scene.add(this.model);
    this.model.traverse((child) => {
    if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
    }
});
  }

  checkBulletCollision(bullet) {
    if (this.isDestroyed) return { hit: false, destroyed: true };

    // For player bullets
    if (bullet.userData && bullet.userData.isPlayerBullet) {
      // Check distance to each pillar
      const distanceToLeftPillar = bullet.position.distanceTo(
        this.leftPillarPos
      );
      const distanceToRightPillar = bullet.position.distanceTo(
        this.rightPillarPos
      );

      // If bullet is close to either pillar - reduced collision radius from 1.0 to 0.8
      if (distanceToLeftPillar < 0.7 || distanceToRightPillar < 0.7) {
        this.health -= 10;
        if (this.health <= 0) {
          this.destroy();
          return { hit: true, destroyed: true };
        }
        return { hit: true, destroyed: false };
      }

      // Check for top section only if bullet is high enough
      if (bullet.position.y >= -4) {
        const distanceToTop = bullet.position.distanceTo(this.topPos);
        // Reduced collision radius from 2 to 1.5
        if (distanceToTop < 1) {
          this.health -= 10;
          if (this.health <= 0) {
            this.destroy();
            return { hit: true, destroyed: true };
          }
          return { hit: true, destroyed: false };
        }
      }
    } else {
      // For enemy bullets, simpler collision check - reduced from 4 to 3
      const distanceToBarrier = bullet.position.distanceTo(this.model.position);
      if (distanceToBarrier < 1) {
        this.health -= 10;
        if (this.health <= 0) {
          this.destroy();
          return { hit: true, destroyed: true };
        }
        return { hit: true, destroyed: false };
      }
    }

    return { hit: false, destroyed: false };
  }

  destroy() {
    this.isDestroyed = true;
    this.scene.remove(this.model);
  }

  checkCollision(position) {
    const distance = position.distanceTo(this.model.position);
    return distance < 2;
  }

  remove() {
    this.scene.remove(this.model);
  }

  getPosition() {
    return this.model.position;
  }
}
