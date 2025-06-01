// src/models/Barrier.js
import * as THREE from "/node_modules/three/build/three.module.js";
import { getBarrierTemplate } from "../utils/BarrierPool.js";

export class Barrier {
  constructor(scene, position) {
    this.scene = scene;
    // Clonamos a posição para não modificar o original
    this.position = position.clone ? position.clone() : new THREE.Vector3(position.x, position.y, position.z);
    this.health = 100;
    this.isDestroyed = false;
    this._createModelFromPool();
  }

  _createModelFromPool() {
    // Pega um clone profundo do template (já com geometria + materiais texturizados)
    this.model = getBarrierTemplate();

    // Posiciona exatamente como antes: y = -4 para “baixar” em relação à câmera
    this.model.position.set(this.position.x, -4, this.position.z);

    // Todos os meshes dentro de this.model já estão com material texturizado, mas
    // precisamos garantir que recebam e projetem sombras:
    this.model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Adiciona o grupo inteiro à cena
    this.scene.add(this.model);

    // Recria as mesmas posições de colisão que você usava
    this.leftPillarPos = new THREE.Vector3(
      this.position.x - 1.6,
      -3.4,
      0
    );
    this.rightPillarPos = new THREE.Vector3(
      this.position.x + 1.3,
      -3.4,
      0
    );
    this.topPos = new THREE.Vector3(
      this.position.x,
      -2.5,
      0
    );
  }

  checkBulletCollision(bullet) {
    if (this.isDestroyed) return { hit: false, destroyed: true };

    // Lógica de colisão idêntica à sua versão anterior
    if (bullet.userData && bullet.userData.isPlayerBullet) {
      const dLeft = bullet.position.distanceTo(this.leftPillarPos);
      const dRight = bullet.position.distanceTo(this.rightPillarPos);

      if (dLeft < 0.7 || dRight < 0.7) {
        this.health -= 10;
        if (this.health <= 0) {
          this.destroy();
          return { hit: true, destroyed: true };
        }
        return { hit: true, destroyed: false };
      }

      if (bullet.position.y >= -4) {
        const dTop = bullet.position.distanceTo(this.topPos);
        if (dTop < 1.0) {
          this.health -= 10;
          if (this.health <= 0) {
            this.destroy();
            return { hit: true, destroyed: true };
          }
          return { hit: true, destroyed: false };
        }
      }
    } else {
      const center = this.model.position.clone();
      const dCenter = bullet.position.distanceTo(center);
      if (dCenter < 1.0) {
        this.health -= 10;
        if (this.health <= 0) {
          this.destroy();
          return { hit: true, destroyed: true };
        }
        return { hit: true, destroyed: false };
      }
    }

    return { hit: false, destroyed: false };
  }

  destroy() {
    this.isDestroyed = true;
    this.scene.remove(this.model);
  }

  remove() {
    if (!this.isDestroyed) {
      this.scene.remove(this.model);
      this.isDestroyed = true;
    }
  }

  getPosition() {
    return this.model.position.clone();
  }

  checkCollision(position) {
    const center = this.model.position.clone();
    return position.distanceTo(center) < 2.0;
  }
}
