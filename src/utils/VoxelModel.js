import * as THREE from "/node_modules/three/build/three.module.js";
import { VOXEL_SIZE } from "./constants.js";

export class VoxelModel {
  // Carrega textura do barrier UMA ÚNICA VEZ (static)
  static barrierTexture = new THREE.TextureLoader().load("src/Textures/barrier.jpeg");
  static playerTexture  = new THREE.TextureLoader().load("src/Textures/nave.png");

  constructor() {
    this.voxels = new THREE.Group();
  }

  addVoxel(x, y, z, color, textureName = null) {
    const geometry = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE);
    let material;

    if (textureName === "barrier") {
      // Reutiliza sempre a mesma textura e o mesmo material
      material = VoxelModel._barrierMaterial;
      if (!material) {
        VoxelModel.barrierTexture.wrapS = THREE.ClampToEdgeWrapping;
        VoxelModel.barrierTexture.wrapT = THREE.ClampToEdgeWrapping;
        VoxelModel.barrierTexture.minFilter = THREE.LinearFilter;

        VoxelModel._barrierMaterial = new THREE.MeshStandardMaterial({
          map: VoxelModel.barrierTexture,
          metalness: 0.7,
          roughness: 0.5,
        });
      }
      material = VoxelModel._barrierMaterial;

    } else if (textureName === "player") {
      // Reutiliza sempre a mesma textura e o mesmo material do player
      material = VoxelModel._playerMaterial;
      if (!material) {
        VoxelModel.playerTexture.wrapS = THREE.ClampToEdgeWrapping;
        VoxelModel.playerTexture.wrapT = THREE.ClampToEdgeWrapping;
        VoxelModel.playerTexture.minFilter = THREE.LinearFilter;

        VoxelModel._playerMaterial = new THREE.MeshStandardMaterial({
          map: VoxelModel.playerTexture,
          metalness: 0.8,
          roughness: 0.9,
        });
      }
      material = VoxelModel._playerMaterial;

    } else {
      // Caso sem textura, usa somente cor sólida
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
