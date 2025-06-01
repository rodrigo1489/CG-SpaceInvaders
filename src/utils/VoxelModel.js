import * as THREE from "/node_modules/three/build/three.module.js";
import { VOXEL_SIZE } from "./constants.js";

export class VoxelModel {
  constructor() {
    this.voxels = new THREE.Group();
  }

addVoxel(x, y, z, color, textureName = null) {
    const geometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
    let material;

    if (textureName === 'barrier') {
        const texture = new THREE.TextureLoader().load('src/Textures/barrier.jpeg');
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        material = new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 0.7,
            roughness: 0.5
        });
    } else if (textureName === 'player') {
        const texture = new THREE.TextureLoader().load('src/Textures/nave.png');
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.minFilter = THREE.LinearFilter;
        material = new THREE.MeshStandardMaterial({
            map: texture,
            metalness: 0.8,
            roughness: 0.9
        });
    } else {
        material = new THREE.MeshPhongMaterial({ color });
    }

    const voxel = new THREE.Mesh(geometry, material);
    voxel.position.set(x * VOXEL_SIZE, y * VOXEL_SIZE, z * VOXEL_SIZE);

    voxel.castShadow = true;
    voxel.receiveShadow = true;

    this.voxels.add(voxel);
}


  addLayer(layer, y, color, z = 0, textureName = null) {
    for (let zIndex = 0; zIndex < layer.length; zIndex++) {
      for (let xIndex = 0; xIndex < layer[zIndex].length; xIndex++) {
        if (layer[zIndex][xIndex] === 1) {
          this.addVoxel(
            xIndex - layer[zIndex].length / 2,
            y,
            zIndex - layer.length / 2 + z,
            color,
            textureName
          );
        }
      }
    }
  }

  getModel() {
    return this.voxels;
  }
}
