/*  Player.js – nave do jogador com laser sprite emissivo  */
import * as THREE from '/node_modules/three/build/three.module.js';
import { COLORS } from '../utils/constants.js';

/* ─────────── texturas ─────────── */
const loader         = new THREE.TextureLoader();
const shipTexture    = loader.load('/src/textures/Spaceship.png');
const bulletGlowTex  = loader.load('/src/textures/player_bullet_glow.png');
bulletGlowTex.wrapS  = bulletGlowTex.wrapT = THREE.ClampToEdgeWrapping;

export class Player {

  constructor(scene, styleIndex = 0) {
    this.scene      = scene;
    this.styleIndex = styleIndex;

    this.createModel();

    /* estado de jogo */
    this.bullets                 = [];
    this.canShoot                = true;
    this.isInvulnerable          = false;
    this.invulnerabilityDuration = 2000;
    this.blinkInterval           = null;

    this.hitboxRadius = 1.0;
    this.hitboxOffset = new THREE.Vector3(-0.2, 0, 0);

    this.debugStats   = { shotsFired: 0, timesHit: 0, distanceMoved: 0 };
    this.lastPosition = new THREE.Vector3().copy(this.model.position);
    this.lastShot     = 0;                 // controla cadência de tiro
  }

  /* ─────────── construção da nave ─────────── */
  createModel() {
    const group = new THREE.Group();

    const colors = [
      { top: 0x00aaff },
      { top: 0x00ff00 },
      { top: 0xff0000 },
      { top: 0xffff00 }
    ];
    const colorScheme = colors[this.styleIndex % colors.length];

    const baseMat = new THREE.MeshStandardMaterial({
      map: shipTexture,
      metalness: 0.8,
      roughness: 0.2
    });
    const topMat = new THREE.MeshStandardMaterial({
      color: colorScheme.top,
      emissive: colorScheme.top,
      emissiveIntensity: 0.7
    });

    /* ---------- estilo 0: caça cilíndrico ---------- */
    if (this.styleIndex === 0) {
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.4, 2.5, 16),
        baseMat
      );
      body.rotation.z = Math.PI / 2;
      group.add(body);

      const cockpit = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 16),
        topMat
      );
      cockpit.position.set(0.6, 0.2, 0);
      group.add(cockpit);

      for (let side of [-1, 1]) {
        const wing = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.6, 1.8),
          baseMat
        );
        wing.position.set(-0.3, -0.3, side);
        wing.rotation.y = side * Math.PI / 8;
        group.add(wing);
      }

    /* ---------- estilo 1: asa delta ---------- */
    } else if (this.styleIndex === 1) {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.4, 0.6),
        baseMat
      );
      group.add(body);

      const cockpit = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.25, 0.6, 16),
        topMat
      );
      cockpit.rotation.z = Math.PI / 2;
      cockpit.position.set(0.2, 0.3, 0);
      group.add(cockpit);

      for (let side of [-1, 1]) {
        const wing = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.4, 1.4),
          baseMat
        );
        wing.rotation.x = side * Math.PI / 8;
        wing.position.set(-0.4, -0.1, side * 0.9);
        group.add(wing);
      }

      const boosters = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.6, 8),
        baseMat
      );
      boosters.rotation.z = Math.PI / 2;
      boosters.position.set(-0.9, -0.2, 0);
      group.add(boosters);

    /* ---------- estilo 2: bombardeiro longo ---------- */
    } else if (this.styleIndex === 2) {
      const fuselage = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.3, 0.5),
        baseMat
      );
      group.add(fuselage);

      const cockpit = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 12, 12),
        topMat
      );
      cockpit.position.set(0.5, 0.25, 0);
      group.add(cockpit);

      for (let side of [-1, 1]) {
        const wing = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.4, 1.6),
          baseMat
        );
        wing.position.set(-0.2, -0.1, side * 0.9);
        group.add(wing);

        const engine = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.4, 12),
          baseMat
        );
        engine.rotation.z = Math.PI / 2;
        engine.position.set(-0.8, -0.15, side * 0.5);
        group.add(engine);
      }

    /* ---------- estilo 3: nave dupla ---------- */
    } else if (this.styleIndex === 3) {
      const mainBody = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.4, 0.8),
        baseMat
      );
      group.add(mainBody);

      for (let i of [-0.3, 0.3]) {
        const cockpit = new THREE.Mesh(
          new THREE.SphereGeometry(0.2, 16, 16),
          topMat
        );
        cockpit.position.set(0.5, 0.3, i);
        group.add(cockpit);
      }

      for (let side of [-1, 1]) {
        const engine = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.6, 12),
          baseMat
        );
        engine.rotation.z = Math.PI / 2;
        engine.position.set(-0.9, -0.1, side * 0.4);
        group.add(engine);
      }

      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.05, 0.5),
        topMat
      );
      plate.position.set(0, 0.25, 0);
      group.add(plate);

      const cannon = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        topMat
      );
      cannon.position.set(1.1, 0, 0);
      group.add(cannon);
    }

    /* posição e rotação iniciais */
    group.position.set(0, -8, 0);
    group.rotation.set(Math.PI * 1.2, Math.PI * 0.5, Math.PI);

    this.model = group;
    this.scene.add(this.model);
    this.model.traverse((child) => {
    if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
    }
});
  }

  /* ─────────── movimento lateral ─────────── */
  move(direction) {
    const speed       = 0.15;
    const oldPosition = this.model.position.clone();

    if (direction === 'left')  this.model.position.x = Math.max(-20, this.model.position.x - speed);
    if (direction === 'right') this.model.position.x = Math.min( 20, this.model.position.x + speed);

    this.debugStats.distanceMoved += this.model.position.distanceTo(oldPosition);
  }

  /* ─────────── utilidades de posição / dano ─────────── */
  getPosition() {
    return this.model.position.clone().add(this.hitboxOffset);
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

  /* ─────────── disparo: laser sprite ─────────── */
  shoot() {
    const now = Date.now();
    if (now - this.lastShot < 300) return null;   // cooldown 300 ms

    /* material sprite emissivo */
    const spriteMat = new THREE.SpriteMaterial({
      map:         bulletGlowTex,
      color:       0xffffff,
      transparent: true,
      depthWrite:  false
    });

    const bullet = new THREE.Sprite(spriteMat);
    bullet.scale.set(0.9, 0.9, 0.9);

    /* posição inicial na ponta da nave */
    const origin = new THREE.Vector3().setFromMatrixPosition(this.model.matrixWorld);
    bullet.position.copy(origin);

    bullet.userData = { isPlayerBullet: true };

    this.scene.add(bullet);
    this.bullets.push(bullet);

    this.lastShot = now;
    this.debugStats.shotsFired++;

    return bullet;
  }
}
