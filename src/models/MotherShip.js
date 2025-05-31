SS/*  MotherShip.js — “Death-Star” procedural  */

import * as THREE from '/node_modules/three/build/three.module.js';

export class MotherShip {

    constructor(scene) {
        this.scene = scene;
        this.createModel();

        /* para rotação lenta */
        this.rotationSpeed = 0.003;
    }

    /* ────────── construção ────────── */
    createModel() {

        const ship = new THREE.Group();

        /* 1. esfera principal */
        const sphereGeo = new THREE.SphereGeometry(10, 64, 48);
        const sphereMat = new THREE.MeshStandardMaterial({
            color: 0x666666,
            metalness: 0.4,
            roughness: 0.6
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        ship.add(sphere);

        /* 2. trincheira equatorial (Torus) */
        const trench = new THREE.Mesh(
            new THREE.TorusGeometry(10.05, 0.4, 8, 80),
            new THREE.MeshStandardMaterial({
                color: 0x4c4c4c,
                metalness: 0.4,
                roughness: 0.5
            })
        );
        trench.rotation.x = Math.PI / 2;
        ship.add(trench);

        /* 2a. detalhes na trincheira: pequenos prismas */
        const detailMat = new THREE.MeshStandardMaterial({ color: 0x5a5a5a, metalness: 0.3, roughness: 0.5 });
        const detailGeo = new THREE.BoxGeometry(0.6, 0.6, 0.8);
        for (let i = 0; i < 32; i++) {
            const d = new THREE.Mesh(detailGeo, detailMat);
            const angle = (i / 32) * Math.PI * 2;
            d.position.set(Math.cos(angle) * 10.6, 0, Math.sin(angle) * 10.6);
            d.lookAt(0, 0, 0);
            ship.add(d);
        }

        /* 3. cratera / super-laser (esfera recortada) */
        const dishGeo = new THREE.SphereGeometry(3, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2);
        const dishMat = new THREE.MeshStandardMaterial({
            color: 0x595959,
            metalness: 0.4,
            roughness: 0.55
        });
        const dish = new THREE.Mesh(dishGeo, dishMat);
        dish.position.set(5.5, 4.5, 0);
        dish.rotation.y = Math.PI / 2;
        ship.add(dish);

        /* 3a. emissor do laser (pequena esfera) */
        const emitter = new THREE.Mesh(
            new THREE.SphereGeometry(0.6, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0x22ff88 })
        );
        emitter.position.set(5.5, 4.5, 0.8);
        ship.add(emitter);

        /* 4. luzes na superfície (pontos emissivos) */
        const windowMat = new THREE.MeshBasicMaterial({ color: 0x88ffdd });
        const windowGeo = new THREE.BoxGeometry(0.35, 0.1, 0.35);
        for (let i = 0; i < 100; i++) {
            const w = new THREE.Mesh(windowGeo, windowMat);
            const lat = (Math.random() - 0.5) * Math.PI;     // -π/2 .. π/2
            const lon = Math.random() * Math.PI * 2;        // 0 .. 2π
            const r   = 10.01;
            w.position.set(
                r * Math.cos(lat) * Math.cos(lon),
                r * Math.sin(lat),
                r * Math.cos(lat) * Math.sin(lon)
            );
            w.lookAt(0, 0, 0);
            ship.add(w);
        }

        /* 5. sombras (opcional se tiveres shadowMap) */
        ship.traverse(o => o.castShadow = o.receiveShadow = true);

        this.model = ship;
        this.scene.add(this.model);
    }

    /* ────────── update/anim ────────── */
    update(deltaTime = 0.016) {
        this.model.rotation.y += this.rotationSpeed * deltaTime * 60;
    }

    /* ────────── util ────────── */

    remove() {
            if (o.material) o.material.dispose();
}}
