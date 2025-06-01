// src/utils/BarrierPool.js
import * as THREE from "/node_modules/three/build/three.module.js";
import { VoxelModel } from "./VoxelModel.js";
import { COLORS } from "./constants.js";

let _cachedBarrierMesh = null;

export function getBarrierTemplate() {
  // Se já tiver gerado antes, retorna um clone profundo imediatamente
  if (_cachedBarrierMesh) {
    // deep clone (true) clona geometria + materiais recursivamente
    return _cachedBarrierMesh.clone(true);
  }

  // ---------- PRIMEIRA CRIAÇÃO: gera UM VoxelModel inteiro de “barreira” ----------
  const model = new VoxelModel();

  // Mesmas camadas que você costumava usar no Barrier.createModel()
  const bottomLayer = [[1, 1, 0, 0, 0, 0, 1, 1]];
  const topLayer = [[1, 1, 1, 1, 1, 1, 1, 1]];

  // Constrói a barreira voxel a voxel
  // (esta parte só será executada UMA SÓ vez)
  for (let i = 0; i < 1; i++) {
    model.addLayer(bottomLayer, 0, COLORS.BARRIER, i, "barrier");
    model.addLayer(bottomLayer, 1, COLORS.BARRIER, i, "barrier");
    model.addLayer(bottomLayer, 2, COLORS.BARRIER, i, "barrier");
    model.addLayer(topLayer, 3, COLORS.BARRIER, i, "barrier");
    model.addLayer(topLayer, 4, COLORS.BARRIER, i, "barrier");
  }

  // Pega o THREE.Group resultante (contendo todos os voxels)
  const rawMesh = model.getModel(); // é um THREE.Group

  // Guarda no cache um clone profundo (true), para que a referência original
  // jamais seja alterada. A partir de agora, sempre clonaremos _cachedBarrierMesh.
  _cachedBarrierMesh = rawMesh.clone(true);

  // Retorna o clone inicial (clone de clone) para uso imediato
  return _cachedBarrierMesh.clone(true);
}
