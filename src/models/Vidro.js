import * as THREE from '/node_modules/three/build/three.module.js';

export class GlassPlane {
    constructor(scene, width = 100, height = 100, positionY = -10.01) {
        this.scene = scene;
        this.createGlassPlane(width, height, positionY);
    }

    createGlassPlane(width, height, positionY) {
        const geometry = new THREE.PlaneGeometry(width, height);
        
        const material = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            metalness: 0,
            roughness: 0,
            opacity: 0.2,
            transparent: true,
            transmission: 1.0,
            thickness: 0.5,
            ior: 1.5,
            clearcoat: 1,
            clearcoatRoughness: 0,
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = positionY;
        this.mesh.receiveShadow = false;

        this.scene.add(this.mesh);
    }

    remove() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
    }
}