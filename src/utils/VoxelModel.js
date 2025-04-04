import * as THREE from '/node_modules/three/build/three.module.js';
import { VOXEL_SIZE } from './constants.js';

export class VoxelModel {
    constructor() {
        this.voxels = new THREE.Group();
    }

    addVoxel(x, y, z, color) {
        const geometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
        const material = new THREE.MeshPhongMaterial({ color });
        const voxel = new THREE.Mesh(geometry, material);
        voxel.position.set(x * VOXEL_SIZE, y * VOXEL_SIZE, z * VOXEL_SIZE);
        this.voxels.add(voxel);
    }

    addLayer(layer, y, color) {
        for (let z = 0; z < layer.length; z++) {
            for (let x = 0; x < layer[z].length; x++) {
                if (layer[z][x] === 1) {
                    this.addVoxel(x - layer[z].length/2, y, z - layer.length/2, color);
                }
            }
        }
    }

    getModel() {
        return this.voxels;
    }
} 