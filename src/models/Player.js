import * as THREE from '/node_modules/three/build/three.module.js';
import { VoxelModel } from '../utils/VoxelModel.js';
import { COLORS, GAME_CONFIG } from '../utils/constants.js';

export class Player {
    constructor(scene) {
        this.scene = scene;
        this.createModel();
        this.bullets = [];
        this.canShoot = true;
        this.isInvulnerable = false;
        this.invulnerabilityDuration = 2000; // 2 seconds of invulnerability
        this.blinkInterval = null;
        this.hitboxRadius = 1.0; // Reduced from 1.2 for more accurate collision detection
        this.hitboxOffset = new THREE.Vector3(-0.2, 0, 0); // Offset slightly to the left
        
        // Debug props
        this.debugStats = {
            shotsFired: 0,
            timesHit: 0,
            distanceMoved: 0
        };
        this.lastPosition = new THREE.Vector3();
        this.lastPosition.copy(this.model.position);
    }

    createModel() {
        const model = new VoxelModel();
        
        // Player design - spaceship shape
        const baseLayer = [
            [0,0,1,1,1,0,0],
            [0,1,1,1,1,1,0],
            [1,1,1,1,1,1,1]
        ];

        const middleLayer = [
            [0,0,0,1,0,0,0],
            [0,1,1,1,1,1,0]
        ];

        const topLayer = [
            [0,0,0,1,0,0,0],
            [0,0,1,1,1,0,0]
        ];

        // Build the spaceship from bottom to top
        model.addLayer(baseLayer, 0, COLORS.PLAYER_BASE);
        model.addLayer(middleLayer, 1, COLORS.PLAYER_TOP);
        model.addLayer(topLayer, 2, COLORS.PLAYER_TOP);
        
        this.model = model.getModel();
        
        // Position player at bottom of screen
        this.model.position.set(0, -8, 0);
        
        // Rotate to point upward
        this.model.rotation.x = -Math.PI * 0.1; // Slight tilt for visibility
        
        this.scene.add(this.model);
        this.lastShot = 0;
        this.shootingCooldown = 500; // 500ms between shots
    }

    shoot() {
        const now = Date.now();
        if (now - this.lastShot < this.shootingCooldown) return null;
        
        // Create bullet with metallic material
        const bulletGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const bulletMaterial = new THREE.MeshStandardMaterial({ 
            color: COLORS.PLAYER_BULLET,
            metalness: 0.8,
            roughness: 0.2
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Position bullet at player's position, maintaining same z position
        bullet.position.set(
            this.model.position.x,    // Same x as player
            this.model.position.y + 1, // Slightly above player
            0                         // Same z-axis as barriers and enemies
        );
        
        // Mark this as a player bullet for special collision handling
        bullet.userData = { isPlayerBullet: true };
        
        this.scene.add(bullet);
        this.lastShot = now;
        
        // Update debug stats
        this.debugStats.shotsFired++;
        
        return bullet;
    }

    move(direction) {
        const speed = 0.15;
        const oldPosition = this.model.position.clone();
        
        if (direction === 'left') {
            this.model.position.x = Math.max(-20, this.model.position.x - speed);
        } else if (direction === 'right') {
            this.model.position.x = Math.min(20, this.model.position.x + speed);
        }
        
        // Calculate distance moved for debug stats
        const distanceMoved = this.model.position.distanceTo(oldPosition);
        this.debugStats.distanceMoved += distanceMoved;
    }

    getPosition() {
        // Return position with offset for more accurate hitbox
        const position = this.model.position.clone();
        position.add(this.hitboxOffset);
        return position;
    }

    hit() {
        if (this.isInvulnerable) return false;
        
        // Update debug stats
        this.debugStats.timesHit++;
        
        // Make player invulnerable
        this.isInvulnerable = true;
        
        // Start blinking effect
        let visible = true;
        this.blinkInterval = setInterval(() => {
            this.model.visible = visible;
            visible = !visible;
        }, 100);
        
        // Remove invulnerability after duration
        setTimeout(() => {
            this.isInvulnerable = false;
            clearInterval(this.blinkInterval);
            this.model.visible = true;
        }, this.invulnerabilityDuration);
        
        return true;
    }
    
    getDebugInfo() {
        return {
            position: this.model.position.clone(),
            isInvulnerable: this.isInvulnerable,
            canShoot: this.canShoot,
            shotsFired: this.debugStats.shotsFired,
            timesHit: this.debugStats.timesHit,
            distanceMoved: this.debugStats.distanceMoved.toFixed(2),
            hitboxRadius: this.hitboxRadius
        };
    }
} 