/*  Enemy.js  –  UFO procedural avançado  */
import * as THREE from '/node_modules/three/build/three.module.js';
import { COLORS } from '../utils/constants.js';

export class Enemy {

  constructor(scene, row, col) {
      this.scene = scene;
      this.row   = row;
      this.col   = col;

      this.createModel();

      /* combate */
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

  /* ─────────────────── construção do UFO ─────────────────── */
  createModel() {

      const ufo = new THREE.Group();

      /* 1. disco principal (LatheGeometry) */
      const profile = [];
      profile.push(new THREE.Vector2( 0.0,  0.0));
      profile.push(new THREE.Vector2( 2.0,  0.0));
      profile.push(new THREE.Vector2( 2.2,  0.25));
      profile.push(new THREE.Vector2( 1.4,  0.6));
      profile.push(new THREE.Vector2( 0.8,  0.75));
      profile.push(new THREE.Vector2( 0.0,  0.8));
      const diskGeo = new THREE.LatheGeometry(profile, 64);
      const diskMat = new THREE.MeshStandardMaterial({
          color: COLORS.ENEMY_BASE,
          metalness: 0.85,
          roughness: 0.3
      });
      const disk = new THREE.Mesh(diskGeo, diskMat);
      disk.castShadow = disk.receiveShadow = true;
      ufo.add(disk);

      /* 2. cúpula transparente */
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

      /* 3. anel luminoso (torus) */
      const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.6, 0.12, 16, 48),
          new THREE.MeshBasicMaterial({
              color: 0x44ff88,
              emissive: 0x44ff88,
              emissiveIntensity: 1
          })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.35;
      ufo.add(ring);
      this.ring = ring;           // para animação de brilho

      /* 4. janelas (pequenos emissores) */
      const windowMat = new THREE.MeshBasicMaterial({ color: 0x66ccff });
      const windowGeo = new THREE.BoxGeometry(0.15, 0.05, 0.3);
      for (let i = 0; i < 12; i++) {
          const w = new THREE.Mesh(windowGeo, windowMat);
          const angle = (i / 12) * Math.PI * 2;
          w.position.set(Math.cos(angle) * 1.4, 0.55, Math.sin(angle) * 1.4);
          w.lookAt(0, 0.55, 0);
          ufo.add(w);
      }

      /* 5. feixe de “abdução” (cone transparente) */
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
      this.beam = beam;           // guardamos para animação

      /* 6. posiciona na grelha */
      const xSpacing = 4;
      const ySpacing = 3;
      ufo.position.set(
          (this.col - 2) * xSpacing,
          20 - this.row  * ySpacing,
          0
      );

      ufo.traverse(o => o.castShadow = o.receiveShadow = true);

      this.model = ufo;
      this.scene.add(this.model);
      this.model.rotation.x = Math.PI/2;
      this.beam.rotation.x = -Math.PI / 2;
  }

  /* ───────── disparo ───────── */
  shoot() {
      const now = Date.now();
      if (now - this.lastShot < this.shootingInterval) return null;

      const bullet = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8),
          new THREE.MeshBasicMaterial({ color: COLORS.ENEMY_BULLET })
      );
      bullet.rotateX(Math.PI/2);
      bullet.position.copy(this.model.position);
      bullet.position.y -= 1.3;
      this.scene.add(bullet);

      this.lastShot = now;
      this.shootingInterval = 2500 + Math.random() * 4000;
      return bullet;
  }

  /* ───────── movimento & animação ───────── */
  move(time) {
      // deslocação lateral
      this.model.position.x += Math.sin(time * this.frequency) * this.amplitude;

      // brilho pulsante no anel
      this.ring.material.emissiveIntensity = 0.6 + 0.4 * Math.sin(time * 6 + this.col);

      // efeito respirante no feixe
      const s = 0.6 + 0.4 * Math.sin(time * 4);
      this.beam.scale.set(s, 1, s);
      this.beam.material.opacity = 0.15 + 0.1 * (s - 0.6);
  }

  /* ───────── destruição ───────── */
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

  /* ───────── utilitários ───────── */
  getPosition()      { return this.model.position.clone(); }
  takeDamage(d = 1)  { this.health -= d; return this.health <= 0; }
}
