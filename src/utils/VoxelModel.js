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

    addLayer(layer, y, color, z = 0) {
        for (let zIndex = 0; zIndex < layer.length; zIndex++) {
            for (let xIndex = 0; xIndex < layer[zIndex].length; xIndex++) {
                if (layer[zIndex][xIndex] === 1) {
                    this.addVoxel(
                        xIndex - layer[zIndex].length/2, 
                        y, 
                        zIndex - layer.length/2 + z, 
                        color
                    );
                }
            }
        }
    }

    getModel() {
        return this.voxels;
    }
} 
