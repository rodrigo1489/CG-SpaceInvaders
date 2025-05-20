import * as THREE from '/node_modules/three/build/three.module.js';
import { VoxelModel } from '../utils/VoxelModel.js';
import { COLORS, GAME_CONFIG } from '../utils/constants.js';

/*
 * Palette of color schemes for the different player ships.
 * - base: main hull colour
 * - top: accent / cockpit colour
 * Add or change entries freely; the index corresponds to the option shown on the
 * ship‑selection screen (0 = first ship, 1 = second, …).
 */
export const SHIP_SCHEMES = [
  { base: COLORS.PLAYER_BASE, top: COLORS.PLAYER_TOP },   // original blue‑white
  { base: 0xff5522,           top: 0xffff88 },            // orange‑yellow
  { base: 0x22ff55,           top: 0xb0ffb0 },            // green‑mint
  { base: 0xaa66ff,           top: 0xffffff }             // purple‑white
];

export class Player {
    /**
     * @param {THREE.Scene} scene        Scene where the model will be inserted.
     * @param {number}      styleIndex   Which entry of SHIP_SCHEMES to use (defaults to 0).
     */
    constructor(scene, styleIndex = 0) {
        this.scene = scene;
        this.styleIndex = styleIndex;

        this.createModel();

        this.bullets = [];
        this.canShoot = true;
        this.isInvulnerable = false;
        this.invulnerabilityDuration = 2000; // 2 seconds of invulnerability
        this.blinkInterval = null;
        this.hitboxRadius = 1.0; // Reduced for more accurate collision detection
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

    /**
     * Build the voxel model and insert it into the scene.
     */
    createModel() {
        const model = new VoxelModel();

        // Voxel layers that define the spaceship shape
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

        // Pick the colour scheme (wrap index safely)
        const scheme = SHIP_SCHEMES[this.styleIndex % SHIP_SCHEMES.length];

        // Build the spaceship from bottom to top
        model.addLayer(baseLayer,   0, scheme.base);
        model.addLayer(middleLayer, 1, scheme.top);
        model.addLayer(topLayer,    2, scheme.top);

        this.model = model.getModel();

        // Position player at bottom of screen
        this.model.position.set(0, -8, 0);

        // Slight tilt for visibility in 3D cameras
        this.model.rotation.x = -Math.PI * 0.1;

        this.scene.add(this.model);
        this.lastShot = 0;
        this.shootingCooldown = 500; // 500 ms between shots
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

        // Position bullet just above the ship
        bullet.position.set(
            this.model.position.x,
            this.model.position.y + 1,
            0
        );

        // Mark this as a player bullet for special collision handling
        bullet.userData = { isPlayerBullet: true };

        this.scene.add(bullet);
        this.lastShot = now;

        // Debug
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

        // Track distance moved (debug)
        const distanceMoved = this.model.position.distanceTo(oldPosition);
        this.debugStats.distanceMoved += distanceMoved;
    }

    /** Accurate hit‑position with optional offset */
    getPosition() {
        const position = this.model.position.clone();
        position.add(this.hitboxOffset);
        return position;
    }

    /** Handle player being hit. Returns true if the hit was accepted. */
    hit() {
        if (this.isInvulnerable) return false;

        // Update stats
        this.debugStats.timesHit++;

        // Become invulnerable for a moment
        this.isInvulnerable = true;

        // Blink effect
        let visible = true;
        this.blinkInterval = setInterval(() => {
            this.model.visible = visible;
            visible = !visible;
        }, 100);

        // Restore normal state
        setTimeout(() => {
            this.isInvulnerable = false;
            clearInterval(this.blinkInterval);
            this.model.visible = true;
        }, this.invulnerabilityDuration);

        return true;
    }

    /** Small pack of useful runtime stats used by the debug panel. */
    getDebugInfo() {
        return {
            position: this.model.position.clone(),
            isInvulnerable: this.isInvulnerable,
            canShoot: this.canShoot,
            shotsFired: this.debugStats.shotsFired,
            timesHit: this.debugStats.timesHit,
            distanceMoved: this.debugStats.distanceMoved.toFixed(2),
            hitboxRadius: this.hitboxRadius,
            styleIndex: this.styleIndex
        };
    }
}
