// src/models/MotherShip.js
import * as THREE from '/node_modules/three/build/three.module.js';

export class MotherShip {
  constructor(scene, renderer = null) {
    this.scene = scene;
    this.createModel(renderer);
    // velocidade de rotação lenta (pode ajustar conforme quiser)
    this.rotationSpeed = 0.003;
  }

  /* ────────── construção do modelo ────────── */
  createModel(renderer) {
    const loader = new THREE.TextureLoader();
    // texturas (coloque estes arquivos em /src/textures/)
    const diffuseMap = loader.load('/src/textures/deathstar_diffuse.png');
    const bumpMap    = loader.load('/src/textures/deathstar_bump.png');

    // Se tivermos renderer disponível, aumentamos anisotropia para melhorar a nitidez
    if (renderer && renderer.capabilities.getMaxAnisotropy) {
      const maxAniso = renderer.capabilities.getMaxAnisotropy();
      diffuseMap.anisotropy = maxAniso;
      bumpMap.anisotropy    = maxAniso;
    }

    // Grupo que conterá todo o Death–Star
    const ship = new THREE.Group();

    /* 1. esfera principal */
    const sphereGeo = new THREE.SphereGeometry(10, 64, 48);
    const sphereMat = new THREE.MeshStandardMaterial({
      map:         diffuseMap,
      bumpMap:     bumpMap,
      bumpScale:   0.15,
      metalness:   0.4,
      roughness:   0.7,
      color:       0xffffff
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.castShadow    = true;
    sphere.receiveShadow = true;
    ship.add(sphere);

    /* 2. trincheira equatorial */
    const trench = new THREE.Mesh(
      new THREE.TorusGeometry(10.05, 0.4, 8, 80),
      new THREE.MeshStandardMaterial({
        color:     0x4c4c4c,
        metalness: 0.4,
        roughness: 0.5
      })
    );
    trench.rotation.x = Math.PI / 2;
    trench.castShadow    = true;
    trench.receiveShadow = true;
    ship.add(trench);

    /* 2a. detalhes (caixotes/painéis) ao redor da trincheira */
    const detailMat = new THREE.MeshStandardMaterial({
      color:     0x5a5a5a,
      metalness: 0.3,
      roughness: 0.5
    });
    const detailGeo = new THREE.BoxGeometry(0.6, 0.6, 0.8);
    for (let i = 0; i < 32; i++) {
      const d = new THREE.Mesh(detailGeo, detailMat);
      const angle = (i / 32) * Math.PI * 2;
      d.position.set(
        Math.cos(angle) * 10.6,
        0,
        Math.sin(angle) * 10.6
      );
      d.lookAt(0, 0, 0);
      d.castShadow    = true;
      d.receiveShadow = true;
      ship.add(d);
    }

    /* 3. cratera do super-laser (bacia esférica) */
    const dishGeo = new THREE.SphereGeometry(3, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const dishMat = new THREE.MeshStandardMaterial({
      color:     0x595959,
      metalness: 0.4,
      roughness: 0.55
    });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(5.5, 4.5, 0);
    dish.rotation.y = Math.PI / 2;
    dish.castShadow    = true;
    dish.receiveShadow = true;
    ship.add(dish);

    /* 3a. emissor do laser */
    const emitter = new THREE.Mesh(
      new THREE.SphereGeometry(0.6, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x22ff88 })
    );
    emitter.position.set(5.5, 4.5, 0.8);
    ship.add(emitter);

    /* 4. janelinhas/luzes pontuais espalhadas */
    const windowMat  = new THREE.MeshBasicMaterial({ color: 0x88ffdd });
    const windowGeo  = new THREE.BoxGeometry(0.35, 0.1, 0.35);
    for (let i = 0; i < 100; i++) {
      const w   = new THREE.Mesh(windowGeo, windowMat);
      const lat = (Math.random() - 0.5) * Math.PI;         // -π/2..π/2
      const lon = Math.random() * Math.PI * 2;            //  0..2π
      const r   = 10.01;
      w.position.set(
        r * Math.cos(lat) * Math.cos(lon),
        r * Math.sin(lat),
        r * Math.cos(lat) * Math.sin(lon)
      );
      w.lookAt(0, 0, 0);
      ship.add(w);
    }

    /* 5. habilitar sombras em todos os meshes */
    ship.traverse(o => {
      if (o.isMesh) {
        o.castShadow    = true;
        o.receiveShadow = true;
      }
    });

    this.model = ship;
    this.scene.add(this.model);

    // Opcional: repetir cast/receive shadow (caso seu render.useShadowMap esteja ativo)
    this.model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow    = true;
        child.receiveShadow = true;
      }
    });
  }

  /* ────────── animação ────────── */
  update(deltaTime = 0.016) {
    this.model.rotation.y += this.rotationSpeed * deltaTime * 60;
  }

  /* ────────── remover do scene ────────── */
  remove() {
    this.model.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material)  o.material.dispose();
    });
    this.scene.remove(this.model);
  }
}
