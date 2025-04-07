import * as THREE from '/node_modules/three/build/three.module.js';
import { Enemy } from './Enemy.js';
import { VoxelModel } from '../utils/VoxelModel.js';
import { COLORS } from '../utils/constants.js';

export class Boss extends Enemy {
    constructor(scene, bossLevel) {
        super(scene, 0, 0); // Call parent constructor
        
        // Boss properties
        this.bossLevel = bossLevel; // 1-4 (levels 5, 10, 15, 20)
        this.isBoss = true;
        this.health = 10 * bossLevel; // Health scales with level
        this.pointValue = 1000 * bossLevel; // More points for higher level bosses
        this.specialAttackTimer = 0;
        this.lastSpecialAttack = 0;
        this.specialAttackCooldown = 5000; // 5 seconds between special attacks
        
        // Override model with boss-specific model
        this.model.remove(...this.model.children); // Remove default model
        this.createBossModel();
        
        // Boss hitbox
        this.hitboxRadius = 3 + bossLevel * 0.5;
        
        // Configure boss behavior based on level
        this.configureBoss();
    }
    
    createBossModel() {
        const model = new VoxelModel();
        
        // Boss design - larger and more complex than regular enemies
        const baseLayer = [
            [0,0,1,1,1,1,1,0,0],
            [0,1,1,1,1,1,1,1,0],
            [1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1],
            [0,1,1,1,1,1,1,1,0],
            [0,0,1,1,1,1,1,0,0]
        ];
        
        const middleLayer = [
            [0,0,0,1,1,1,0,0,0],
            [0,0,1,1,1,1,1,0,0],
            [0,1,1,1,1,1,1,1,0],
            [1,1,1,1,1,1,1,1,1],
            [1,1,1,1,1,1,1,1,1],
            [0,1,1,1,1,1,1,1,0],
            [0,0,1,1,1,1,1,0,0],
            [0,0,0,1,1,1,0,0,0]
        ];
        
        const topLayer = [
            [0,0,0,1,1,1,0,0,0],
            [0,0,1,0,1,0,1,0,0],
            [0,0,1,1,1,1,1,0,0],
            [0,0,0,1,1,1,0,0,0]
        ];
        
        // Use different colors based on boss level
        const baseColor = this.getBossColor();
        const accentColor = this.getBossAccentColor();
        
        // Build the boss from bottom to top
        model.addLayer(baseLayer, 0, baseColor);
        model.addLayer(middleLayer, 1, baseColor);
        model.addLayer(topLayer, 2, accentColor);
        
        // Add special details for higher level bosses
        if (this.bossLevel >= 2) {
            const weaponLayer = [
                [1,0,0,0,0,0,0,0,1],
                [0,0,0,0,0,0,0,0,0],
                [1,0,0,0,0,0,0,0,1]
            ];
            model.addLayer(weaponLayer, 1.5, accentColor);
        }
        
        if (this.bossLevel >= 3) {
            // Add wing structures for level 3+ bosses
            const wingGeometry = new THREE.BoxGeometry(2, 0.5, 0.5);
            const wingMaterial = new THREE.MeshStandardMaterial({ 
                color: accentColor,
                metalness: 0.8,
                roughness: 0.2
            });
            
            const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
            leftWing.position.set(-5, 0, 0);
            
            const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
            rightWing.position.set(5, 0, 0);
            
            model.getModel().add(leftWing);
            model.getModel().add(rightWing);
        }
        
        if (this.bossLevel >= 4) {
            // Add more details for final boss
            const crownGeometry = new THREE.BoxGeometry(3, 1, 0.5);
            const crownMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xffaa00,
                metalness: 0.8,
                roughness: 0.2
            });
            
            const crown = new THREE.Mesh(crownGeometry, crownMaterial);
            crown.position.set(0, 3, 0);
            
            model.getModel().add(crown);
        }
        
        this.model = model.getModel();
        
        // Scale boss size based on level
        const scale = 1.5 + (this.bossLevel * 0.5);
        this.model.scale.set(scale, scale, scale);
        
        // Position boss at top of screen
        this.model.position.set(0, 15, 0);
        
        // Rotate to face down
        this.model.rotation.x = Math.PI * 0.1;
        
        this.scene.add(this.model);
    }
    
    getBossColor() {
        // Different colors for each boss level
        switch(this.bossLevel) {
            case 1: return 0xff0000; // Red (level 5)
            case 2: return 0xff00ff; // Magenta (level 10)
            case 3: return 0x0000ff; // Blue (level 15)
            case 4: return 0xffaa00; // Orange-gold (level 20)
            default: return 0xff0000;
        }
    }
    
    getBossAccentColor() {
        // Accent colors for each boss level
        switch(this.bossLevel) {
            case 1: return 0xffff00; // Yellow (level 5)
            case 2: return 0x00ffff; // Cyan (level 10)
            case 3: return 0xff00ff; // Magenta (level 15)
            case 4: return 0xffffff; // White (level 20)
            default: return 0xffff00;
        }
    }
    
    configureBoss() {
        // Configure boss behavior based on level
        switch(this.bossLevel) {
            case 1: // Level 5 boss - Side-to-side movement
                this.amplitude = 0.1;
                this.frequency = 0.5;
                this.shootingInterval = 2000;
                break;
                
            case 2: // Level 10 boss - Faster movement, rapid fire
                this.amplitude = 0.15;
                this.frequency = 0.8;
                this.shootingInterval = 1500;
                this.multiShot = 2; // Can fire 2 bullets at once
                break;
                
            case 3: // Level 15 boss - Complex movement, very rapid fire
                this.amplitude = 0.2;
                this.frequency = 1;
                this.shootingInterval = 1000;
                this.multiShot = 3; // Can fire 3 bullets at once
                break;
                
            case 4: // Level 20 boss - Final boss, ultimate challenge
                this.amplitude = 0.25;
                this.frequency = 1.2;
                this.shootingInterval = 800;
                this.multiShot = 4; // Can fire 4 bullets at once
                this.specialAttack = true; // Can use special attacks
                break;
        }
    }
    
    move(time) {
        // Complex movement pattern for bosses
        this.model.position.x = Math.sin(time * this.frequency) * (10 * this.amplitude);
        
        // Slight vertical movement for higher level bosses
        if (this.bossLevel >= 2) {
            this.model.position.y = 15 + Math.sin(time * this.frequency * 0.5) * 2;
        }
        
        // Check if it's time for a special attack
        if (this.specialAttack && Date.now() - this.lastSpecialAttack > this.specialAttackCooldown) {
            this.specialAttackTimer++;
            
            // Do special attack every 300 frames (about 5 seconds)
            if (this.specialAttackTimer >= 300) {
                this.performSpecialAttack();
                this.specialAttackTimer = 0;
                this.lastSpecialAttack = Date.now();
            }
        }
    }
    
    shoot() {
        const now = Date.now();
        if (now - this.lastShot < this.shootingInterval) return null;
        
        // Create bullets based on multiShot setting
        const bullets = [];
        const bulletCount = this.multiShot || 1;
        
        for (let i = 0; i < bulletCount; i++) {
            const bulletSpread = (i - (bulletCount - 1) / 2) * 0.8; // Spread bullets horizontally
            
            // Create bullet with metallic material
            const bulletGeometry = new THREE.BoxGeometry(0.3, 0.8, 0.3);
            const bulletMaterial = new THREE.MeshStandardMaterial({ 
                color: this.getBossAccentColor(),
                metalness: 0.8,
                roughness: 0.2
            });
            
            const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
            
            // Position bullet at boss position with spread
            bullet.position.copy(this.model.position);
            bullet.position.y -= 2;  // Adjust for boss size
            bullet.position.x += bulletSpread;
            
            // Mark this as a boss bullet for special effects
            bullet.userData = { isBossBullet: true, bossLevel: this.bossLevel };
            
            this.scene.add(bullet);
            bullets.push(bullet);
        }
        
        this.lastShot = now;
        
        // Return array of bullets or null
        return bullets.length ? bullets : null;
    }
    
    performSpecialAttack() {
        // Create a special attack effect based on boss level
        const specialAttackType = this.bossLevel;
        
        switch(specialAttackType) {
            case 4: // Final boss special attack - create circular bullet pattern
                this.createCircularBulletPattern();
                break;
            
            default: // Default special attack for other boss levels
                this.createLaserBeam();
                break;
        }
    }
    
    createCircularBulletPattern() {
        // Create a circular pattern of bullets around the boss
        const bulletCount = 12;
        const bullets = [];
        
        for (let i = 0; i < bulletCount; i++) {
            const angle = (i / bulletCount) * Math.PI * 2;
            
            // Create bullet with metallic material
            const bulletGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
            const bulletMaterial = new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                metalness: 0.8,
                roughness: 0.2
            });
            
            const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
            
            // Position bullet in a circle around the boss
            bullet.position.copy(this.model.position);
            bullet.position.x += Math.cos(angle) * 3;
            bullet.position.y += Math.sin(angle) * 3 - 2;
            
            // Set special properties on bullet for circular pattern movement
            bullet.userData = { 
                isSpecialAttack: true, 
                angle: angle,
                speed: 0.2,
                radius: 3
            };
            
            this.scene.add(bullet);
            bullets.push(bullet);
        }
        
        return bullets;
    }
    
    createLaserBeam() {
        // Create a laser beam effect with metallic material
        const laserGeometry = new THREE.BoxGeometry(0.5, 20, 0.5);
        const laserMaterial = new THREE.MeshStandardMaterial({ 
            color: this.getBossAccentColor(),
            transparent: true,
            opacity: 0.7,
            metalness: 0.8,
            roughness: 0.2
        });
        
        const laser = new THREE.Mesh(laserGeometry, laserMaterial);
        
        // Position laser at boss position
        laser.position.copy(this.model.position);
        laser.position.y -= 10;  // Center the laser beam
        
        // Mark this as a special attack
        laser.userData = { 
            isSpecialAttack: true,
            damage: this.bossLevel,
            duration: 60 // Frames to live
        };
        
        this.scene.add(laser);
        return laser;
    }
    
    takeDamage(amount = 1) {
        // Flash the boss when hit
        this.flashOnHit();
        
        // Boss takes damage like normal enemy
        return super.takeDamage(amount);
    }
    
    flashOnHit() {
        // Flash effect when boss takes damage
        const originalMaterials = [];
        
        // Store original materials
        this.model.traverse((child) => {
            if (child.isMesh) {
                originalMaterials.push({
                    mesh: child,
                    material: child.material.clone()
                });
                
                // Change to flash material
                child.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
            }
        });
        
        // Restore original materials after a short delay
        setTimeout(() => {
            originalMaterials.forEach(({mesh, material}) => {
                mesh.material.dispose();
                mesh.material = material;
            });
        }, 100);
    }
} 