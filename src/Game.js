// Classe principal do jogo
export class Game {
    constructor() {
        // Inicialização do jogo
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        
        // Configuração do renderizador
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000);
        document.body.appendChild(this.renderer.domElement);
        
        // Configuração da câmera
        this.camera.position.z = 15;
        
        // Inicialização de variáveis do jogo
        this.player = null;
        this.enemies = [];
        this.barriers = [];
        this.bullets = [];
        this.score = 0;
        this.level = 1;
        this.gameOver = false;
        this.paused = false;
        
        // Configuração de controles
        this.keys = {
            left: false,
            right: false,
            shoot: false
        };
        
        // Configuração de eventos
        this.setupEventListeners();
        
        // Inicialização do jogo
        this.init();
    }

    // Configuração dos listeners de eventos
    setupEventListeners() {
        // Eventos de teclado
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Evento de redimensionamento da janela
        window.addEventListener('resize', () => this.handleResize());
    }

    // Manipulação de teclas pressionadas
    handleKeyDown(e) {
        switch(e.key) {
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'ArrowRight':
                this.keys.right = true;
                break;
            case ' ':
                this.keys.shoot = true;
                break;
            case 'p':
                this.togglePause();
                break;
        }
    }

    // Manipulação de teclas liberadas
    handleKeyUp(e) {
        switch(e.key) {
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'ArrowRight':
                this.keys.right = false;
                break;
            case ' ':
                this.keys.shoot = false;
                break;
        }
    }

    // Manipulação do redimensionamento da janela
    handleResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // Inicialização do jogo
    init() {
        // Criação do jogador
        this.player = new Player(this.scene);
        
        // Criação das barreiras
        this.createBarriers();
        
        // Criação dos inimigos
        this.createEnemies();
        
        // Início do loop do jogo
        this.gameLoop();
    }

    // Criação das barreiras
    createBarriers() {
        const barrierPositions = [
            new THREE.Vector3(-6, -5, 0),
            new THREE.Vector3(0, -5, 0),
            new THREE.Vector3(6, -5, 0)
        ];
        
        barrierPositions.forEach(position => {
            this.barriers.push(new Barrier(this.scene, position));
        });
    }

    // Criação dos inimigos
    createEnemies() {
        const rows = GAME_CONFIG.ENEMY_ROWS;
        const cols = GAME_CONFIG.ENEMY_COLS;
        const spacing = 2;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = (col - (cols - 1) / 2) * spacing;
                const y = (row - (rows - 1) / 2) * spacing + 5;
                const position = new THREE.Vector3(x, y, 0);
                
                this.enemies.push(new Enemy(this.scene, position));
            }
        }
    }

    // Atualização do estado do jogo
    update() {
        if (this.paused || this.gameOver) return;
        
        // Atualização do jogador
        this.player.update(this.keys);
        
        // Atualização dos inimigos
        this.enemies.forEach(enemy => enemy.update());
        
        // Atualização das balas
        this.bullets = this.bullets.filter(bullet => bullet.update());
        
        // Verificação de colisões
        this.checkCollisions();
    }

    // Verificação de colisões
    checkCollisions() {
        // Verifica colisões entre balas e inimigos
        this.bullets.forEach((bullet, bulletIndex) => {
            this.enemies.forEach((enemy, enemyIndex) => {
                if (this.checkCollision(bullet, enemy)) {
                    if (enemy.takeDamage(1)) {
                        this.enemies.splice(enemyIndex, 1);
                        this.score += GAME_CONFIG.POINTS_PER_ENEMY;
                    }
                    bullet.destroy();
                    this.bullets.splice(bulletIndex, 1);
                }
            });
        });
        
        // Verifica colisões entre balas e barreiras
        this.bullets.forEach((bullet, bulletIndex) => {
            this.barriers.forEach((barrier, barrierIndex) => {
                if (barrier.checkBulletCollision(bullet)) {
                    bullet.destroy();
                    this.bullets.splice(bulletIndex, 1);
                }
            });
        });
    }

    // Verificação de colisão entre dois objetos
    checkCollision(obj1, obj2) {
        const pos1 = obj1.getPosition();
        const pos2 = obj2.getPosition();
        const distance = pos1.distanceTo(pos2);
        return distance < 1;
    }

    // Alterna o estado de pausa do jogo
    togglePause() {
        this.paused = !this.paused;
    }

    // Loop principal do jogo
    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());
        
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
} 