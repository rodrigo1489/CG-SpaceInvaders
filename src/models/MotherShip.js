import * as THREE from 'three';

export class MotherShip {

    constructor(scene) {
        this.scene = scene;
        this.createModel();
        this.rotationSpeed = 0.003;
    }

    createModel() {
        const ship = new THREE.Group();

        // Corpo principal
        const base = new THREE.Mesh(
            new THREE.SphereGeometry(10, 64, 48),
            new THREE.MeshStandardMaterial({
                color: 0x444444,
                metalness: 0.5,
                roughness: 0.4
            })
        );
        ship.add(base);

        // Faixa equatorial
        const trench = new THREE.Mesh(
            new THREE.TorusGeometry(10.2, 0.5, 12, 100),
            new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.4, roughness: 0.3 })
        );
        trench.rotation.x = Math.PI / 2;
        ship.add(trench);

        // Torres de defesa
        const turretMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        for (let i = 0; i < 10; i++) {
            const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.4, 1.5, 6), turretMat);
            const angle = (i / 10) * Math.PI * 2;
            const radius = 10.8;
            turret.position.set(Math.cos(angle) * radius, 2.5, Math.sin(angle) * radius);
            turret.lookAt(0, 0, 0);
            ship.add(turret);
        }

        // Detalhes técnicos (greebles)
        const greebleGeo = new THREE.BoxGeometry(0.5, 0.2, 0.5);
        const greebleMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
        for (let i = 0; i < 50; i++) {
            const g = new THREE.Mesh(greebleGeo, greebleMat);
            const lat = (Math.random() - 0.5) * Math.PI;
            const lon = Math.random() * Math.PI * 2;
            const r = 10.3;
            g.position.set(
                r * Math.cos(lat) * Math.cos(lon),
                r * Math.sin(lat),
                r * Math.cos(lat) * Math.sin(lon)
            );
            g.lookAt(0, 0, 0);
            ship.add(g);
        }

        // Super-laser
        const dish = new THREE.Mesh(
            new THREE.SphereGeometry(3, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.4, roughness: 0.5 })
        );
        dish.position.set(5.5, 4.5, 0);
        dish.rotation.y = Math.PI / 2;
        ship.add(dish);

        const emitter = new THREE.Mesh(
            new THREE.SphereGeometry(0.6, 12, 12),
            new THREE.MeshBasicMaterial({ color: 0x22ff88 })
        );
        emitter.position.set(5.5, 4.5, 0.8);
        ship.add(emitter);

        // Luzes/janelas
        const windowMat = new THREE.MeshBasicMaterial({ color: 0x88ffdd });
        const windowGeo = new THREE.BoxGeometry(0.3, 0.1, 0.3);
        for (let i = 0; i < 80; i++) {
            const w = new THREE.Mesh(windowGeo, windowMat);
            const lat = (Math.random() - 0.5) * Math.PI;
            const lon = Math.random() * Math.PI * 2;
            const r = 10.01;
            w.position.set(
                r * Math.cos(lat) * Math.cos(lon),
                r * Math.sin(lat),
                r * Math.cos(lat) * Math.sin(lon)
            );
            w.lookAt(0, 0, 0);
            ship.add(w);
        }

        // Ativa sombras
        ship.traverse(o => o.castShadow = o.receiveShadow = true);

        this.model = ship;
        this.scene.add(this.model);
    }

    update(deltaTime = 0.016) {
        this.model.rotation.y += this.rotationSpeed * deltaTime * 60;
    }

    remove() {
        this.scene.remove(this.model);
        this.model.traverse(o => {
            if (o.geometry) o.geometry.dispose();
            if (o.material) o.material.dispose();
        });
    }
}
