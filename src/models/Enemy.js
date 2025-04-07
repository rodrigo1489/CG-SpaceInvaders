import * as THREE from '/node_modules/three/build/three.module.js';
import { VoxelModel } from '../utils/VoxelModel.js';
import { COLORS } from '../utils/constants.js';

export class Enemy {
    constructor(scene, row, col) {
        this.scene = scene;
        this.row = row;
        this.col = col;
        this.createModel();
        this.lastShot = 0;
        this.shootingInterval = 3000 + Math.random() * 5000;
        this.hitboxRadius = 1.0; // Reduced for more accurate collision detection
        this.hitboxOffset = new THREE.Vector3(-0.2, 0, 0); // Offset slightly to the left, matching player
        
        // Movement parameters
        this.amplitude = 0.02; // Default amplitude for side-to-side movement
        this.frequency = 1;    // Default frequency for movement
        
        // Health and scoring
        this.health = 1;       // Regular enemies die in one hit
        this.pointValue = 100; // Base points for killing this enemy
    }

    createModel() {
        const model = new VoxelModel();
        
        // Enemy base design
        const baseLayer = [
            [0,1,1,1,0],
            [1,1,1,1,1],
            [1,1,1,1,1],
            [0,1,1,1,0]
        ];

        // Top details
        const topLayer = [
            [1,0,1,0,1]
        ];

        // Build the enemy from bottom to top
        model.addLayer(baseLayer, 0, COLORS.ENEMY_BASE);
        model.addLayer(topLayer, 1, COLORS.ENEMY_TOP);
        
        this.model = model.getModel();
        
        // Position enemies in straight lines
        const xSpacing = 4;
        const ySpacing = 3;
        
        this.model.position.set(
            (this.col - 2) * xSpacing,    // X spacing
            20 - this.row * ySpacing,     // Y position
            0                             // All in same Z plane
        );
        
        // Rotate to face down
        this.model.rotation.x = Math.PI * 0.1; // Slight tilt for visibility
        
        this.scene.add(this.model);
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot < this.shootingInterval) return null;
        
        // Create bullet with metallic material
        const bulletGeometry = new THREE.BoxGeometry(0.2, 0.6, 0.2);
        const bulletMaterial = new THREE.MeshStandardMaterial({ 
            color: COLORS.ENEMY_BULLET,
            metalness: 0.8,
            roughness: 0.2
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        bullet.position.copy(this.model.position);
        bullet.position.y -= 1;
        
        this.scene.add(bullet);
        this.lastShot = now;
        this.shootingInterval = 3000 + Math.random() * 5000;
        
        return bullet;
    }

    move(time) {
        // Side-to-side movement with configurable amplitude and frequency
        this.model.position.x += Math.sin(time * this.frequency) * this.amplitude;
    }

    remove() {
        this.createExplosion();
        this.scene.remove(this.model);
    }

    createExplosion() {
        const explosionGeometry = new THREE.SphereGeometry(1, 8, 8);
        const explosionMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true });
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.copy(this.model.position);
        this.scene.add(explosion);

        // Animate explosion
        const duration = 500; // milliseconds
        const startTime = performance.now();

        const animateExplosion = (time) => {
            const elapsed = time - startTime;
            const progress = elapsed / duration;

            if (progress < 1) {
                explosion.scale.set(progress * 3, progress * 3, progress * 3);
                explosion.material.opacity = 1 - progress;
                requestAnimationFrame(animateExplosion);
            } else {
                this.scene.remove(explosion);
            }
        };

        requestAnimationFrame(animateExplosion);
    }

    getPosition() {
        // Return position with offset for more accurate hitbox
        const position = this.model.position.clone();
        position.add(this.hitboxOffset);
        return position;
    }
    
    /**
     * Take damage and return true if destroyed
     * @param {number} amount - Amount of damage to take
     * @returns {boolean} - Whether the enemy was destroyed
     */
    takeDamage(amount = 1) {
        this.health -= amount;
        return this.health <= 0;
    }
} 