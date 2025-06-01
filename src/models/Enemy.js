/*  Enemy.js  –  UFO procedural avançado com texturas e balas próprias  */
import * as THREE from '/node_modules/three/build/three.module.js';
import { COLORS } from '../utils/constants.js';

/* ──────────── TEXTURAS (carregadas uma vez) ──────────── */
const texLoader = new THREE.TextureLoader();

// corpo metálico
const diskBase  = texLoader.load('/src/textures/ufo_plating_basecolor.png');
const diskMetal = texLoader.load('/src/textures/ufo_plating_metallic.png');
const diskRough = texLoader.load('/src/textures/ufo_plating_roughness.png');

// anel emissivo verde
const ringGlow  = texLoader.load('/src/textures/ring_emissive.png');

// janelas azuis translúcidas
const winTex    = texLoader.load('/src/textures/window.png');

// brilho extra para a bala do inimigo
const enemyBulletGlow = texLoader.load('/src/textures/bullet_glow.png');

/* tiling horizontal para o disco */
[diskBase, diskMetal, diskRough].forEach(t => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
});

/* helper: maximiza anisotropy se receber renderer */
function setAnisotropy(renderer) {
  const max = renderer?.capabilities.getMaxAnisotropy?.() || 1;
  [diskBase, diskMetal, diskRough, ringGlow, winTex, enemyBulletGlow]
    .forEach(t => (t.anisotropy = max));
}

export class Enemy {

  constructor(scene, row, col, renderer = null) {
    this.scene = scene;
    this.row   = row;
    this.col   = col;

    if (renderer) setAnisotropy(renderer);

    this.createModel();

    /* estado de combate */
    this.lastShot         = 0;
    this.shootingInterval = 2500 + Math.random() * 4000;

    /* colisão */
    this.hitboxRadius = 1.8;

    /* movimento */
    this.amplitude  = 0.025;
    this.frequency  = 1;

    /* vida / pontos */
    this.health     = 1;
    this.pointValue = 120;
  }

  /* ───────────────── construção do UFO ───────────────── */
  createModel() {
    const ufo = new THREE.Group();

    /* disco principal */
    const profile = [
      new THREE.Vector2(0,   0),
      new THREE.Vector2(2.0, 0),
      new THREE.Vector2(2.2, 0.25),
      new THREE.Vector2(1.4, 0.6),
      new THREE.Vector2(0.8, 0.75),
      new THREE.Vector2(0,   0.8)
    ];
    const diskGeo = new THREE.LatheGeometry(profile, 64);
    const diskMat = new THREE.MeshStandardMaterial({
      map:          diskBase,
      metalnessMap: diskMetal,
      roughnessMap: diskRough,
      metalness:    1,
      roughness:    0.35
    });
    const disk = new THREE.Mesh(diskGeo, diskMat);
    disk.castShadow = disk.receiveShadow = true;
    ufo.add(disk);

    /* cúpula transparente */
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhysicalMaterial({
        color: 0x88bbff,
        metalness: 0,
        roughness: 0,
        transmission: 0.9,
        thickness: 0.1
      })
    );
    dome.position.y = 0.8;
    ufo.add(dome);

    /* anel luminoso */
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.12, 16, 48),
      new THREE.MeshStandardMaterial({
        map:               ringGlow,
        transparent:       true,
        emissive:          0xffffff,
        emissiveMap:       ringGlow,
        emissiveIntensity: 1
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.35;
    ufo.add(ring);
    this.ring = ring;

    /* janelas ao redor */
    const windowMat = new THREE.MeshBasicMaterial({ map: winTex, transparent: true });
    const windowGeo = new THREE.BoxGeometry(0.15, 0.05, 0.3);
    for (let i = 0; i < 12; i++) {
      const w = new THREE.Mesh(windowGeo, windowMat);
      const angle = (i / 12) * Math.PI * 2;
      w.position.set(Math.cos(angle) * 1.4, 0.55, Math.sin(angle) * 1.4);
      w.lookAt(0, 0.55, 0);
      ufo.add(w);
    }

    /* feixe de abdução */
    const beamGeo = new THREE.ConeGeometry(0.1, 3.5, 32, 1, true);
    beamGeo.translate(0, -1.75, 0);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x55ffff,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = -0.1;
    ufo.add(beam);
    this.beam = beam;

    /* posicionamento na grelha */
    const xSpacing = 4;
    const ySpacing = 3;
    ufo.position.set((this.col - 2) * xSpacing, 20 - this.row * ySpacing, 0);

    ufo.traverse(o => (o.castShadow = o.receiveShadow = true));

    this.model = ufo;
    this.scene.add(this.model);
    this.model.rotation.x = Math.PI / 2;
    this.beam.rotation.x  = -Math.PI / 2;
    this.model.traverse((child) => {
    if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
    }
});
  }

  /* ─────────── disparo ─────────── */
  shoot() {
    const now = Date.now();
    if (now - this.lastShot < this.shootingInterval) return null;

    /* bala cilíndrica com textura emissiva própria */
    const bulletGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8, 1, true);
    const bulletMat = new THREE.MeshStandardMaterial({
      map:               enemyBulletGlow,
      emissiveMap:       enemyBulletGlow,
      emissive:          0xffffff,
      emissiveIntensity: 1.5,
      transparent:       true,
      depthWrite:        false,
      metalness:         0,
      roughness:         0
    });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);
    bullet.rotateX(Math.PI / 2);
    bullet.position.copy(this.model.position);
    bullet.position.y -= 1.3;
    this.scene.add(bullet);

    this.lastShot         = now;
    this.shootingInterval = 2500 + Math.random() * 4000;
    return bullet;
  }

  /* ─────────── movimento & animação ─────────── */
  move(time) {
    this.model.position.x += Math.sin(time * this.frequency) * this.amplitude;

    /* ring glow */
    this.ring.material.emissiveIntensity = 0.6 + 0.4 * Math.sin(time * 6 + this.col);

    /* beam breathing */
    const s = 0.6 + 0.4 * Math.sin(time * 4);
    this.beam.scale.set(s, 1, s);
    this.beam.material.opacity = 0.15 + 0.1 * (s - 0.6);
  }

  /* ─────────── destruição ─────────── */
  remove() {
    this.createExplosion();
    this.scene.remove(this.model);
    this.model.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }

  createExplosion() {
    const boom = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true })
    );
    boom.position.copy(this.model.position);
    this.scene.add(boom);

    const t0 = performance.now(), dur = 600;
    const step = (t) => {
      const k = (t - t0) / dur;
      if (k < 1) {
        boom.scale.setScalar(k * 4);
        boom.material.opacity = 1 - k;
        requestAnimationFrame(step);
      } else {
        this.scene.remove(boom);
        boom.geometry.dispose();
        boom.material.dispose();
      }
    };
    requestAnimationFrame(step);
  }

  /* ─────────── utilitários ─────────── */
  getPosition()      { return this.model.position.clone(); }
  takeDamage(d = 1)  { this.health -= d; return this.health <= 0; }
}
