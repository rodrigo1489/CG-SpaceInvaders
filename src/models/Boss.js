// src/models/Boss.js
import * as THREE from '/node_modules/three/build/three.module.js';
import { Enemy } from './Enemy.js';
import { VoxelModel } from '../utils/VoxelModel.js';
import { COLORS } from '../utils/constants.js';

export class Boss extends Enemy {
  constructor(scene, bossLevel, renderer = null) {
    super(scene, 0, 0); // Inicializa como Enemy “genérico”, mas logo sobrepomos o modelo

    this.bossLevel = bossLevel;                // nível (1→4)
    this.isBoss = true;
    this.health = 10 * bossLevel;              // vida aumenta com o nível
    this.pointValue = 1000 * bossLevel;        // pontos
    this.specialAttackTimer = 0;
    this.lastSpecialAttack = 0;
    this.specialAttackCooldown = 5000;         // 5s entre ataques especiais

    // Remove o modelo padrão de Enemy (provavelmente um cubinho)
    this.model.traverse(child => {
      if (child.isMesh) child.geometry.dispose();
    });
    this.model.clear();

    // Cria novo modelo “porreiro” e texturizado
    this.createBossModel(renderer);

    // Ajusta hitbox de acordo com o novo tamanho
    this.hitboxRadius = 3 + bossLevel * 0.5;

    // Configura comportamento (movimento, tiros) baseado no nível
    this.configureBoss();
  }

  createBossModel(renderer) {
    const loader = new THREE.TextureLoader();

    // Carrega texturas específicas para cada nível (coloque em /src/textures/)
    const diffuseMap = loader.load(`/src/textures/boss${this.bossLevel}_diffuse.png`);
    const normalMap  = loader.load(`/src/textures/boss${this.bossLevel}_normal.png`);
    const emissiveMap= loader.load(`/src/textures/boss${this.bossLevel}_emissive.png`);

    // Ajusta anisotropy se tiver renderer
    if (renderer && renderer.capabilities.getMaxAnisotropy) {
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      [diffuseMap, normalMap, emissiveMap].forEach(tex => {
        if (tex) tex.anisotropy = maxAniso;
      });
    }

    // Grupo principal do boss
    const bossGroup = new THREE.Group();

    // ─── 1. Corpo principal em voxel, mas com material texturizado ───
    const model = new VoxelModel();

    // Camadas base, middle e top (mesmas de antes)
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

    // Cria material texturizado para os voxels principais
    const voxelMaterial = new THREE.MeshStandardMaterial({
      map:       diffuseMap,
      normalMap: normalMap,
      emissiveMap: emissiveMap,
      emissiveIntensity: 0.4,
      metalness: 0.6,
      roughness: 0.5,
      color:     0xffffff
    });

    // Temporariamente substituímos COLORS.BARRIER pela textura do nível atual
    model._tempMaterial = voxelMaterial; 
    // (adaptar addVoxel para usar model._tempMaterial em vez de criar MeshStandardMaterial genérico)
    model.addLayer(baseLayer, 0, COLORS.BARRIER);
    model.addLayer(middleLayer, 1, COLORS.BARRIER);
    model.addLayer(topLayer, 2, COLORS.BARRIER);

    const voxelMesh = model.getModel();
    bossGroup.add(voxelMesh);

    // ─── 2. Detalhes “metálicos” adicionais (wings, armaduras) ───
    if (this.bossLevel >= 2) {
      const wingGeo = new THREE.BoxGeometry(2.5, 0.4, 0.4);
      const wingMat = new THREE.MeshPhysicalMaterial({
        color:     0x333333,
        metalness: 0.9,
        roughness: 0.2,
        clearcoat: 0.3
      });

      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(-6, 0, 0);
      leftWing.castShadow = true;
      leftWing.receiveShadow = true;
      bossGroup.add(leftWing);

      const rightWing = leftWing.clone();
      rightWing.position.set(6, 0, 0);
      bossGroup.add(rightWing);
    }

    if (this.bossLevel >= 3) {
      const antennaGeo = new THREE.CylinderGeometry(0.1, 0.1, 3, 12);
      const antennaMat = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        metalness: 0.7,
        roughness: 0.3
      });
      const antennaLeft = new THREE.Mesh(antennaGeo, antennaMat);
      antennaLeft.position.set(-2, 4, 0);
      antennaLeft.rotation.z = Math.PI / 8;
      antennaLeft.castShadow = true;
      antennaLeft.receiveShadow = true;
      bossGroup.add(antennaLeft);

      const antennaRight = antennaLeft.clone();
      antennaRight.position.set(2, 4, 0);
      antennaRight.rotation.z = -Math.PI / 8;
      bossGroup.add(antennaRight);
    }

    if (this.bossLevel >= 4) {
      // Coroa metálica no topo
      const crownGeo = new THREE.TorusGeometry(3.5, 0.3, 8, 64);
      const crownMat = new THREE.MeshPhysicalMaterial({
        color:      0xffdd00,
        metalness:  1.0,
        roughness:  0.2,
        clearcoat:  0.5,
        clearcoatRoughness: 0.1
      });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(0, 4.5, 0);
      crown.rotation.x = Math.PI / 2;
      crown.castShadow = true;
      crown.receiveShadow = true;
      bossGroup.add(crown);
    }

    // ─── 3. Ajustes finais: escala, posição, rotação ───
    const scale = 1.5 + this.bossLevel * 0.5;
    bossGroup.scale.set(scale, scale, scale);

    // Posição inicial: “aparece” acima da tela
    bossGroup.position.set(0, 15, 0);
    bossGroup.rotation.x = Math.PI * 0.1;
    this.scene.add(bossGroup);

    bossGroup.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    this.model = bossGroup;
  }

  getBossColor() {
    switch (this.bossLevel) {
      case 1: return 0xff3333;   // Vermelho-escuro
      case 2: return 0xff00ff;   // Magenta
      case 3: return 0x3333ff;   // Azul-escuro
      case 4: return 0xffaa00;   // Laranja-amarelo
      default: return 0xffffff;
    }
  }

  getBossAccentColor() {
    switch (this.bossLevel) {
      case 1: return 0xffff66;   // Amarelo-claro
      case 2: return 0x66ffff;   // Ciano-claro
      case 3: return 0xff66ff;   // Rosa-claro
      case 4: return 0xffffff;   // Branco
      default: return 0xffffff;
    }
  }

  configureBoss() {
    // Ajusta movimento, intervalo de tiro e outros
    switch (this.bossLevel) {
      case 1: 
        this.amplitude = 0.1;
        this.frequency = 0.4;
        this.shootingInterval = 2000;
        this.multiShot = 1;
        break;
      case 2:
        this.amplitude = 0.15;
        this.frequency = 0.7;
        this.shootingInterval = 1500;
        this.multiShot = 2;
        break;
      case 3:
        this.amplitude = 0.2;
        this.frequency = 1.0;
        this.shootingInterval = 1000;
        this.multiShot = 3;
        break;
      case 4:
        this.amplitude = 0.25;
        this.frequency = 1.2;
        this.shootingInterval = 800;
        this.multiShot = 4;
        this.specialAttack = true;
        break;
      default:
        this.amplitude = 0.1;
        this.frequency = 0.5;
        this.shootingInterval = 2000;
        this.multiShot = 1;
    }
    this.lastShot = Date.now();
  }

  move(time) {
    // Movimento horizontal oscilante
    this.model.position.x = Math.sin(time * this.frequency) * (10 * this.amplitude);

    // Boss de nível ≥2 “flutua” verticalmente
    if (this.bossLevel >= 2) {
      this.model.position.y = 15 + Math.sin(time * this.frequency * 0.5) * 2;
    }

    // Ataque especial (se habilitado)
    if (this.specialAttack && Date.now() - this.lastSpecialAttack > this.specialAttackCooldown) {
      this.specialAttackTimer++;
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

    const bullets = [];
    const count = this.multiShot || 1;

    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 1.0;
      const geo = new THREE.BoxGeometry(0.3, 0.8, 0.3);
      const mat = new THREE.MeshStandardMaterial({
        color: this.getBossAccentColor(),
        metalness: 1.0,
        roughness: 0.2
      });
      const bullet = new THREE.Mesh(geo, mat);

      bullet.position.copy(this.model.position);
      bullet.position.y -= 2;
      bullet.position.x += spread;
      bullet.userData = { isBossBullet: true, bossLevel: this.bossLevel };

      this.scene.add(bullet);
      bullets.push(bullet);
    }

    this.lastShot = now;
    return bullets.length ? bullets : null;
  }

  performSpecialAttack() {
    if (this.bossLevel === 4) {
      this.createCircularBulletPattern();
    } else {
      this.createLaserBeam();
    }
  }

  createCircularBulletPattern() {
    const bullets = [];
    const count = 12;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const geo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        metalness: 1.0,
        roughness: 0.2
      });
      const b = new THREE.Mesh(geo, mat);

      b.position.copy(this.model.position);
      b.position.x += Math.cos(angle) * 3;
      b.position.y += Math.sin(angle) * 3 - 2;
      b.userData = {
        isSpecialAttack: true,
        angle: angle,
        speed: 0.3,
        radius: 3
      };

      this.scene.add(b);
      bullets.push(b);
    }

    return bullets;
  }

  createLaserBeam() {
    const geo = new THREE.BoxGeometry(0.5, 20, 0.5);
    const mat = new THREE.MeshStandardMaterial({
      color: this.getBossAccentColor(),
      transparent: true,
      opacity: 0.7,
      metalness: 1.0,
      roughness: 0.2
    });
    const laser = new THREE.Mesh(geo, mat);

    laser.position.copy(this.model.position);
    laser.position.y -= 10;
    laser.userData = {
      isSpecialAttack: true,
      damage: this.bossLevel,
      duration: 60
    };

    this.scene.add(laser);
    return laser;
  }

  takeDamage(amount = 1) {
    this.flashOnHit();
    return super.takeDamage(amount);
  }

  flashOnHit() {
    const originals = [];
    this.model.traverse(child => {
      if (child.isMesh) {
        originals.push({ mesh: child, material: child.material.clone() });
        child.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
      }
    });
    setTimeout(() => {
      originals.forEach(o => {
        o.mesh.material.dispose();
        o.mesh.material = o.material;
      });
    }, 100);
  }
}
