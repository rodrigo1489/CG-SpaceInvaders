// src/utils/LoadingManager.js

import * as THREE from "three";

export class LoadingManager {
  constructor(onLoadAll) {
    // Cria um THREE.LoadingManager que chama onLoadAll quando todos os assets forem carregados
    this.manager = new THREE.LoadingManager();
    this.manager.onLoad = onLoadAll;
    this.manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      console.log(`Carregando asset: ${url} (${itemsLoaded}/${itemsTotal})`);
      // Aqui poderias atualizar uma barra de progresso se desejado
    };
  }

  // Retorna uma Promise que carrega uma textura via TextureLoader
  loadTexture(url) {
    return new Promise((resolve, reject) => {
      new THREE.TextureLoader(this.manager).load(
        url,
        texture => resolve(texture),
        undefined,
        err => reject(err)
      );
    });
  }

  // Retorna uma Promise que carrega um áudio HTML5
  loadAudio(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = url;
      audio.addEventListener(
        "canplaythrough",
        () => resolve(audio),
        { once: true }
      );
      audio.addEventListener(
        "error",
        err => reject(err),
        { once: true }
      );
    });
  }
}
