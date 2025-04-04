import * as THREE from '/node_modules/three/build/three.module.js';
import { Player } from './models/Player.js';
import { Enemy } from './models/Enemy.js';
import { Barrier } from './models/Barrier.js';
import { GAME_CONFIG } from './utils/constants.js';

class SpaceInvaders {
    constructor() {
        this.setupScene();
        this.setupLighting();
        this.setupGame();
        this.setupEventListeners();
        this.animate();
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('game-canvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000);

        // Create starfield
        this.createStarfield();

        // Initial camera position
        this.camera.position.set(0, -12, 15);
        this.camera.lookAt(0, 5, 0);
    }

    createStarfield() {
        // Create star particles
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 0.1,
            transparent: true
        });

        const starsVertices = [];
        for(let i = 0; i < 2000; i++) {
            const x = (Math.random() - 0.5) * 200;
            const y = (Math.random() - 0.5) * 200;
            const z = (Math.random() - 0.5) * 100 - 50; // Push stars behind the scene
            starsVertices.push(x, y, z);
        }

        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        this.starfield = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(this.starfield);

        // Add a subtle blue nebula effect
        const nebulaTexture = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png');
        const nebulaMaterial = new THREE.SpriteMaterial({
            map: nebulaTexture,
            color: 0x0066ff,
            transparent: true,
            opacity: 0.1,
            blending: THREE.AdditiveBlending
        });

        for(let i = 0; i < 20; i++) {
            const nebula = new THREE.Sprite(nebulaMaterial);
            nebula.position.set(
                (Math.random() - 0.5) * 100,
                (Math.random() - 0.5) * 100,
                -50
            );
            nebula.scale.set(20, 20, 1);
            this.scene.add(nebula);
        }
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        // Add point lights for dramatic effect
        const pointLight1 = new THREE.PointLight(0xff0000, 0.5, 50);
        pointLight1.position.set(-20, 15, 10);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x00ff00, 0.5, 50);
        pointLight2.position.set(20, 15, 10);
        this.scene.add(pointLight2);
    }

    setupGame() {
        this.gameStarted = false;
        this.player = new Player(this.scene);
        this.enemies = [];
        this.barriers = [];
        this.playerBullets = [];
        this.enemyBullets = [];
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.highestLevel = parseInt(localStorage.getItem('highestLevel')) || 1;
        
        // Update displays
        document.getElementById('high-score').textContent = `HIGH SCORE: ${this.highScore}`;
        document.getElementById('highest-level').textContent = `HIGHEST LEVEL: ${this.highestLevel}`;
        this.updateHUD();

        this.createLevel();
    }

    createLevel() {
        // Clear any existing enemies and barriers
        this.enemies.forEach(enemy => enemy.remove());
        this.barriers.forEach(barrier => barrier.remove());
        this.enemies = [];
        this.barriers = [];
        
        // Remove any existing bullets
        this.playerBullets.forEach(bullet => this.scene.remove(bullet));
        this.enemyBullets.forEach(bullet => this.scene.remove(bullet));
        this.playerBullets = [];
        this.enemyBullets = [];

        // Create enemies with increased difficulty per level
        const enemySpacing = 8;
        const enemyRowSpacing = 3;
        const enemyRows = Math.min(GAME_CONFIG.ENEMY_ROWS + Math.floor(this.level / 2), 8);
        const enemyCols = Math.min(GAME_CONFIG.ENEMY_COLS + Math.floor(this.level / 3), 8);
        const enemyOffset = -(enemyCols * enemySpacing) / 2 + enemySpacing/2;

        for (let row = 0; row < enemyRows; row++) {
            for (let col = 0; col < enemyCols; col++) {
                const enemy = new Enemy(this.scene, row, col);
                enemy.model.position.x = enemyOffset + (col * enemySpacing);
                enemy.model.position.y = 15 - (row * enemyRowSpacing);
                this.enemies.push(enemy);
            }
        }

        // Create barriers
        const barrierSpacing = 12;
        const barrierOffset = -(GAME_CONFIG.BARRIER_COUNT * barrierSpacing) / 2 + barrierSpacing/2;

        for (let i = 0; i < GAME_CONFIG.BARRIER_COUNT; i++) {
            const position = new THREE.Vector3(
                barrierOffset + (i * barrierSpacing),
                -2,
                0
            );
            this.barriers.push(new Barrier(this.scene, position));
        }
    }

    setupEventListeners() {
        this.keys = {};
        window.addEventListener('keydown', (e) => this.keys[e.key] = true);
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);
        window.addEventListener('resize', () => this.handleResize());

        const startButton = document.getElementById('start-button');
        const menuElement = document.getElementById('menu');
        const nextLevelButton = document.getElementById('next-level-button');
        const restartButton = document.getElementById('restart-button');

        startButton.addEventListener('click', () => {
            menuElement.style.display = 'none';
            this.gameStarted = true;
        });

        nextLevelButton.addEventListener('click', () => {
            document.getElementById('level-complete').style.display = 'none';
            this.level++;
            this.updateHUD();
            this.createLevel();
            this.gameStarted = true;
        });

        restartButton.addEventListener('click', () => {
            document.getElementById('game-over').style.display = 'none';
            location.reload();
        });

        document.getElementById('game-mode').addEventListener('change', (e) => {
            const playerPos = this.player.getPosition();
            if (e.target.value === 'action-cam') {
                // 3D angled view
                this.camera.position.set(playerPos.x * 0.8, -12, 15);
                this.camera.lookAt(playerPos.x * 0.8, 5, 0);
            } else {
                // 2D view - same distance but straight on
                this.camera.position.set(playerPos.x * 0.8, 0, 30);
                this.camera.lookAt(playerPos.x * 0.8, 0, 0);
            }
        });
    }

    handleResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    update() {
        if (!this.gameStarted) return;

        // Rotate starfield slightly for subtle movement
        if (this.starfield) {
            this.starfield.rotation.z += 0.0001;
        }

        // Player movement
        if (this.keys['ArrowLeft']) {
            this.player.move('left');
        }
        if (this.keys['ArrowRight']) {
            this.player.move('right');
        }
        if (this.keys[' '] || this.keys['Enter']) {
            const bullet = this.player.shoot();
            if (bullet) this.playerBullets.push(bullet);
        }

        // Update camera to follow player based on current view mode
        const playerPos = this.player.getPosition();
        const gameMode = document.getElementById('game-mode').value;
        
        if (gameMode === 'action-cam') {
            // 3D angled view
            this.camera.position.x = playerPos.x * 0.8;
            this.camera.lookAt(playerPos.x * 0.8, 5, 0);
        } else {
            // 2D view
            this.camera.position.x = playerPos.x * 0.8;
            this.camera.lookAt(playerPos.x * 0.8, 0, 0);
        }

        // Enemy shooting
        if (Math.random() < 0.02 && this.enemies.length > 0) {
            const randomEnemy = this.enemies[Math.floor(Math.random() * this.enemies.length)];
            const bullet = randomEnemy.shoot();
            if (bullet) this.enemyBullets.push(bullet);
        }

        this.updateBullets();

        // Animate enemies
        const time = Date.now() * 0.001;
        this.enemies.forEach(enemy => {
            enemy.move(time);
            // Game over if enemies reach the bottom
            if (enemy.model.position.y < -5) {
                this.showGameOver();
                return;
            }
        });

        // Check level complete
        if (this.enemies.length === 0) {
            this.showLevelComplete();
        }
    }

    updateBullets() {
        // Update player bullets
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const bullet = this.playerBullets[i];
            bullet.position.y += GAME_CONFIG.BULLET_SPEED;
            bullet.position.z = 0; // Ensure bullet stays in the same plane
            
            // Check for enemy collisions first
            let bulletHitEnemy = false;
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                const distance = bullet.position.distanceTo(enemy.getPosition());
                if (distance < 1.5) {
                    this.scene.remove(bullet);
                    this.playerBullets.splice(i, 1);
                    enemy.remove();
                    this.enemies.splice(j, 1);
                    this.score += 100;
                    this.updateHUD();
                    bulletHitEnemy = true;
                    break;
                }
            }
            if (bulletHitEnemy) continue;
            
            // Then check for barrier collisions
            let bulletHitBarrier = false;
            for (const barrier of this.barriers) {
                const collision = barrier.checkBulletCollision(bullet);
                if (collision.hit) {
                    this.scene.remove(bullet);
                    this.playerBullets.splice(i, 1);
                    bulletHitBarrier = true;
                    break;
                }
            }
            if (bulletHitBarrier) continue;

            // Remove bullets that go off screen
            if (bullet.position.y > 20) {
                this.scene.remove(bullet);
                this.playerBullets.splice(i, 1);
            }
        }

        // Update enemy bullets
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            bullet.position.y -= GAME_CONFIG.BULLET_SPEED;
            bullet.position.z = 0; // Ensure bullet stays in the same plane
            
            // Check player collision first
            const playerDistance = bullet.position.distanceTo(this.player.getPosition());
            if (playerDistance < 1.5) {
                this.scene.remove(bullet);
                this.enemyBullets.splice(i, 1);
                
                // Only decrease lives if player is not invulnerable
                if (this.player.hit()) {
                    this.lives--;
                    this.updateHUD();
                    
                    if (this.lives <= 0) {
                        this.showGameOver();
                        return;
                    }
                }
                continue;
            }
            
            // Then check for barrier collisions
            let bulletHitBarrier = false;
            for (const barrier of this.barriers) {
                const collision = barrier.checkBulletCollision(bullet);
                if (collision.hit) {
                    this.scene.remove(bullet);
                    this.enemyBullets.splice(i, 1);
                    bulletHitBarrier = true;
                    break;
                }
            }
            if (bulletHitBarrier) continue;

            // Remove bullets that go off screen
            if (bullet.position.y < -10) {
                this.scene.remove(bullet);
                this.enemyBullets.splice(i, 1);
            }
        }
    }

    updateHUD() {
        document.getElementById('score').textContent = `SCORE: ${this.score}`;
        document.getElementById('lives').textContent = `LIVES: ${this.lives}`;
        document.getElementById('level').textContent = `LEVEL: ${this.level}`;
    }

    showLevelComplete() {
        this.gameStarted = false;
        document.getElementById('level-score').textContent = `SCORE: ${this.score}`;
        document.getElementById('current-level').textContent = `LEVEL: ${this.level}`;
        document.getElementById('level-complete').style.display = 'flex';
        
        // Update highest level if current level is higher
        if (this.level > this.highestLevel) {
            this.highestLevel = this.level;
            localStorage.setItem('highestLevel', this.highestLevel);
            document.getElementById('highest-level').textContent = `HIGHEST LEVEL: ${this.highestLevel}`;
        }
    }

    showGameOver() {
        this.gameStarted = false;
        document.getElementById('final-score').textContent = `FINAL SCORE: ${this.score}`;
        document.getElementById('levels-completed').textContent = `LEVELS COMPLETED: ${this.level - 1}`;
        document.getElementById('game-over').style.display = 'flex';
        
        // Update high score if current score is higher
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
            document.getElementById('high-score').textContent = `HIGH SCORE: ${this.highScore}`;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Start the game
const game = new SpaceInvaders(); 