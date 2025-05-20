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
    const group = new THREE.Group();
    const scheme = SHIP_SCHEMES[this.styleIndex % SHIP_SCHEMES.length];
    const baseMat = new THREE.MeshStandardMaterial({ color: scheme.base });
    const topMat = new THREE.MeshStandardMaterial({ color: scheme.top });

    let bulletOrigin = new THREE.Vector3();

    if (this.styleIndex === 0) {
        // Nave 1
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.5, 16), baseMat);
        body.rotation.z = Math.PI/2;
        group.add(body);

        const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), topMat);
        cockpit.position.set(0.6, 0.2, 0);
        group.add(cockpit);

        for (let side of [-1, 1]) {
            const wing = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 1.8), baseMat);
            wing.position.set(-0.3, -0.3, side * 1);
            wing.rotation.y = side * Math.PI / 8;
            group.add(wing);
        }

        bulletOrigin.set(1.5, 0, 0);
    }

    else if (this.styleIndex === 1) {
        // Nave 2
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.6), baseMat);
        group.add(body);

        const cockpit = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 16), topMat);
        cockpit.rotation.z = Math.PI / 2;
        cockpit.position.set(0.2, 0.3, 0);
        group.add(cockpit);

        for (let side of [-1, 1]) {
            const wing = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 1.4), baseMat);
            wing.rotation.x = side * Math.PI / 8;
            wing.position.set(-0.4, -0.1, side * 0.9);
            group.add(wing);
        }

        const boosters = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8), baseMat);
        boosters.rotation.z = Math.PI / 2;
        boosters.position.set(-0.9, -0.2, 0);
        group.add(boosters);

        bulletOrigin.set(0.7, 0, 0);
    }

    else if (this.styleIndex === 2) {
        // Nave 3
        const fuselage = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.3, 0.5), baseMat);
        group.add(fuselage);

        const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), topMat);
        cockpit.position.set(0.5, 0.25, 0);
        group.add(cockpit);

        const wings = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 1.6), baseMat);
        for (let side of [-1, 1]) {
            const wingClone = wings.clone();
            wingClone.position.set(-0.2, -0.1, side * 0.9);
            group.add(wingClone);
        }

        for (let side of [-1, 1]) {
            const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.4, 12), baseMat);
            engine.rotation.z = Math.PI / 2;
            engine.position.set(-0.8, -0.15, side * 0.5);
            group.add(engine);
        }

        bulletOrigin.set(0.9, 0, 0);
    }

    else if (this.styleIndex === 3) {
    //Nave 4
    const mainBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.8), baseMat);
    group.add(mainBody);

    // Cockpit duplo
    for (let i of [-0.3, 0.3]) {
        const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), topMat);
        cockpit.position.set(0.5, 0.3, i);
        group.add(cockpit);
    }

    // Motores laterais
    for (let side of [-1, 1]) {
        const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 12), baseMat);
        engine.rotation.z = Math.PI / 2;
        engine.position.set(-0.9, -0.1, side * 0.4);
        group.add(engine);
    }

    // Detalhes técnicos
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.5), topMat);
    plate.position.set(0, 0.25, 0);
    group.add(plate);

    const cannon = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), topMat);
    cannon.position.set(1.1, 0, 0);
    group.add(cannon);

    bulletOrigin.set(1.2, 0, 0);
}


    group.position.set(0, -8, 0);
    group.rotation.x = -Math.PI * 0.1;
    this.model = group;
    this.scene.add(this.model);
    this.bulletOffset = bulletOrigin;

    this.lastShot = 0;
    this.shootingCooldown = 500;
}




    shoot() {
    const now = Date.now();
    if (now - this.lastShot < this.shootingCooldown) return null;

    const bulletGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const bulletMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.PLAYER_BULLET,
        metalness: 0.8,
        roughness: 0.2
    });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    const origin = this.bulletOffset.clone().applyMatrix4(this.model.matrixWorld);
    bullet.position.copy(origin);

    bullet.userData = { isPlayerBullet: true };

    this.scene.add(bullet);
    this.lastShot = Date.now();
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
