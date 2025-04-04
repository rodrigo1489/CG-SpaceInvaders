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
        
        const bullet = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.6, 0.2),
            new THREE.MeshPhongMaterial({ color: 0xff0000 })
        );
        
        bullet.position.copy(this.model.position);
        bullet.position.y -= 1;
        
        this.scene.add(bullet);
        this.lastShot = now;
        this.shootingInterval = 3000 + Math.random() * 5000;
        
        return bullet;
    }

    move(time) {
        // Simple side-to-side movement
        const amplitude = 0.02;
        const frequency = 1;
        this.model.position.x += Math.sin(time * frequency) * amplitude;
    }

    remove() {
        this.scene.remove(this.model);
    }

    getPosition() {
        return this.model.position;
    }
} 