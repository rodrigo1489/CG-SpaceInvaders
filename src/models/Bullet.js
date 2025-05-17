// Modelo da bala e suas funcionalidades
export class Bullet {
    constructor(scene, position, direction, color, speed = GAME_CONFIG.BULLET_SPEED) {
        // Inicialização da cena, posição e direção
        this.scene = scene;
        this.position = position;
        this.direction = direction; // 1 para cima, -1 para baixo
        this.color = color;
        this.speed = speed;
        this.model = this.createModel(); // Cria o modelo 3D
    }

    // Criação do modelo 3D da bala
    createModel() {
        const model = new VoxelModel();
        
        // Cria a bala como um único voxel
        model.addVoxel(0, 0, 0, this.color);
        
        // Obtém o modelo final
        const bulletModel = model.getModel();
        bulletModel.position.copy(this.position);
        this.scene.add(bulletModel);
        
        return bulletModel;
    }

    // Atualiza a posição da bala
    update() {
        // Move a bala na direção especificada
        this.model.position.y += this.direction * this.speed;
        
        // Verifica se a bala saiu da tela
        if (this.model.position.y > GAME_CONFIG.SCREEN_BOUNDS || this.model.position.y < -GAME_CONFIG.SCREEN_BOUNDS) {
            this.destroy();
            return false;
        }
        return true;
    }

    // Destrói a bala
    destroy() {
        this.scene.remove(this.model);
    }

    // Retorna a posição da bala
    getPosition() {
        return this.model.position;
    }
} 