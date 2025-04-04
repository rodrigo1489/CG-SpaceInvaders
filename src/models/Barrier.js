import * as THREE from '/node_modules/three/build/three.module.js';
import { VoxelModel } from '../utils/VoxelModel.js';
import { COLORS } from '../utils/constants.js';

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
            [1,1,0,0,0,0,1,1]  // Wider gap between supports (4 blocks)
        ];

        const topLayer = [
            [1,1,1,1,1,1,1,1]  // Full width top
        ];

        // Build the barrier: bottom supports and solid top
        for (let i = 0; i < 1; i++) {  // Make it 3 blocks deep
            // Bottom layers with gap
            model.addLayer(bottomLayer, 0, COLORS.BARRIER, i);
            model.addLayer(bottomLayer, 1, COLORS.BARRIER, i);
            model.addLayer(bottomLayer, 2, COLORS.BARRIER, i);
            // Top solid layers
            model.addLayer(topLayer, 3, COLORS.BARRIER, i);
            model.addLayer(topLayer, 4, COLORS.BARRIER, i);
        }
        
        this.model = model.getModel();
        
        // Position barrier
        this.model.position.set(
            this.position.x,
            -4,  // Lower position to match camera angle
            0    // Same z-axis as other objects
        );

        // Store pillar centers for collision detection
        this.leftPillarPos = new THREE.Vector3(this.position.x -0, -0, 0);
        this.rightPillarPos = new THREE.Vector3(this.position.x + 0, -0, 0);
        
        this.scene.add(this.model);
    }

    checkBulletCollision(bullet) {
        if (this.isDestroyed) return { hit: false, destroyed: true };

        // For player bullets
        if (bullet.userData && bullet.userData.isPlayerBullet) {
            // Check distance to each pillar
            const distanceToLeftPillar = bullet.position.distanceTo(this.leftPillarPos);
            const distanceToRightPillar = bullet.position.distanceTo(this.rightPillarPos);
            
            // If bullet is close to either pillar
            if (distanceToLeftPillar < 1.0 || distanceToRightPillar < 1.0) {
                this.health -= 10;
                if (this.health <= 0) {
                    this.destroy();
                    return { hit: true, destroyed: true };
                }
                return { hit: true, destroyed: false };
            }

            // Check for top section only if bullet is high enough
            if (bullet.position.y >= -2) {
                const distanceToBarrierCenter = bullet.position.distanceTo(this.model.position);
                if (distanceToBarrierCenter < 4) {
                    this.health -= 10;
                    if (this.health <= 0) {
                        this.destroy();
                        return { hit: true, destroyed: true };
                    }
                    return { hit: true, destroyed: false };
                }
            }
        } else {
            // For enemy bullets, simpler collision check
            const distanceToBarrier = bullet.position.distanceTo(this.model.position);
            if (distanceToBarrier < 4) {
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
} 