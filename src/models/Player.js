import * as THREE from '/node_modules/three/build/three.module.js';
import { COLORS } from '../utils/constants.js';

const loader = new THREE.TextureLoader();
const texture = loader.load('/src/textures/Spaceship.png');

export class Player {

    constructor(scene, styleIndex = 0) {
        this.scene = scene;
        this.styleIndex = styleIndex;

        this.createModel();

        this.bullets = [];
        this.canShoot = true;
        this.isInvulnerable = false;
        this.invulnerabilityDuration = 2000;
        this.blinkInterval = null;
        this.hitboxRadius = 1.0;
        this.hitboxOffset = new THREE.Vector3(-0.2, 0, 0);

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

        const scheme = SHIP_SCHEMES[this.styleIndex % SHIP_SCHEMES.length];

        // Aplica a textura 'nave.jpg' usando o nome 'player'
        model.addLayer(baseLayer,   0, scheme.base, 0, 'player');
        model.addLayer(middleLayer, 1, scheme.top,  0, 'player');
        model.addLayer(topLayer,    2, scheme.top,  0, 'player');

        this.model = model.getModel();
        this.model.position.set(0, -8, 0);
        this.model.rotation.x = -Math.PI * 0.1;

        this.scene.add(this.model);
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
        bullet.position.set(
            this.model.position.x,
            this.model.position.y + 1,
            0
        );
        bullet.userData = { isPlayerBullet: true };
        this.scene.add(bullet);
        this.lastShot = now;

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

        const distanceMoved = this.model.position.distanceTo(oldPosition);
        this.debugStats.distanceMoved += distanceMoved;
    }

    getPosition() {
        const position = this.model.position.clone();
        position.add(this.hitboxOffset);
        return position;
    }

    hit() {
        if (this.isInvulnerable) return false;
        this.debugStats.timesHit++;
        this.isInvulnerable = true;

        let visible = true;
        this.blinkInterval = setInterval(() => {
            this.model.visible = visible;
            visible = !visible;
        }, 100);

        setTimeout(() => {
            this.isInvulnerable = false;
            clearInterval(this.blinkInterval);
            this.model.visible = true;
        }, this.invulnerabilityDuration);

        return true;
    }

    shoot() {
    const now = Date.now();
    if (now - this.lastShot < 500) return null;

    const bulletGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const bulletMaterial = new THREE.MeshStandardMaterial({
        color: COLORS.PLAYER_BULLET,
        metalness: 0.8,
        roughness: 0.2
    });

    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    const origin = new THREE.Vector3(0, 0, 0).applyMatrix4(this.model.matrixWorld);
    bullet.position.copy(origin);

    bullet.userData = { isPlayerBullet: true };

    this.scene.add(bullet);
    this.lastShot = Date.now();
    this.debugStats.shotsFired++;

    return bullet;
}


}



