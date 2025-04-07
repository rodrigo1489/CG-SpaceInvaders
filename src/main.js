import * as THREE from '/node_modules/three/build/three.module.js';
import { Player } from './models/Player.js';
import { Enemy } from './models/Enemy.js';
import { Boss } from './models/Boss.js';
import { Barrier } from './models/Barrier.js';
import { GAME_CONFIG } from './utils/constants.js';

class SpaceInvaders {
    constructor() {
        this.setupScene();
        this.setupLighting();
        this.setupGame();
        this.setupDebugMode();
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
            size: 0.2,
            transparent: true
        });

        const starsVertices = [];
        
        // Create random stars
        for(let i = 0; i < 1000; i++) {
            const x = (Math.random() - 0.5) * 200;
            const y = (Math.random() - 0.5) * 200;
            const z = (Math.random() - 0.5) * 100 - 50;
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
        
        // Debug properties
        this.debugMode = false;
        this.debugObjects = [];
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fps = 0;
        
        // Update displays
        document.getElementById('high-score').textContent = `HIGH SCORE: ${this.highScore}`;
        document.getElementById('highest-level').textContent = `HIGHEST LEVEL: ${this.highestLevel}`;
        this.updateHUD();

        this.createLevel();
    }

    setupDebugMode() {
        this.debugInfoPanel = document.getElementById('debug-info');
        this.debugPanel = document.getElementById('debug-panel');
        
        // Frame counter for FPS calculation
        this.frames = 0;
        this.lastFpsUpdate = 0;
    }

    toggleDebugMode(enable) {
        this.debugMode = enable;
        this.debugPanel.style.display = enable ? 'block' : 'none';
        
        // Clear any existing debug visualizations
        this.clearDebugVisualizations();
        
        if (enable) {
            this.createDebugVisualizations();
        }
    }
    
    clearDebugVisualizations() {
        // Remove any existing debug hitboxes or helpers
        for (const obj of this.debugObjects) {
            this.scene.remove(obj);
        }
        this.debugObjects = [];
    }
    
    createDebugVisualizations() {
        // Create collision visualization for player
        this.createHitboxVisualization(this.player, 1.5, 0x00ff00);
        
        // Create collision visualization for enemies
        for (const enemy of this.enemies) {
            this.createHitboxVisualization(enemy, 1.5, 0xff0000);
        }
        
        // Create collision visualization for barriers
        for (const barrier of this.barriers) {
            // Create specific barrier hitbox visualization - more box-like
            this.createBarrierHitboxVisualization(barrier);
        }
        
        // Add axes helper to show coordinate system
        const axesHelper = new THREE.AxesHelper(10);
        this.scene.add(axesHelper);
        this.debugObjects.push(axesHelper);
    }
    
    createHitboxVisualization(entity, radius = 1.5, color = 0xff0000) {
        if (!entity || !entity.model) return;
        
        // Create a bounding sphere visualization
        const position = entity.getPosition();
        // Use entity's own hitbox radius if available
        const hitboxRadius = entity.hitboxRadius || radius;
        const geometry = new THREE.SphereGeometry(hitboxRadius, 16, 16);
        const material = new THREE.MeshBasicMaterial({ 
            color: color, 
            wireframe: true,
            transparent: true,
            opacity: 0.5 
        });
        
        const hitbox = new THREE.Mesh(geometry, material);
        hitbox.position.copy(position);
        
        // Store reference to the entity for updating position
        hitbox.userData.entityRef = entity;
        
        this.scene.add(hitbox);
        this.debugObjects.push(hitbox);
    }
    
    createBarrierHitboxVisualization(barrier) {
        if (!barrier || !barrier.model) return;
        
        // Create a barrier hitbox visualization
        const position = barrier.getPosition();
        
        // Create a box that approximates the barrier's actual collision area - reduced size
        const geometry = new THREE.BoxGeometry(3.5, 2.5, 0.8);
        const material = new THREE.MeshBasicMaterial({ 
            color: 0xff9900, 
            wireframe: true,
            transparent: true,
            opacity: 0.5 
        });
        
        const hitbox = new THREE.Mesh(geometry, material);
        hitbox.position.copy(position);
        
        // Store reference to the barrier for updating position
        hitbox.userData.entityRef = barrier;
        
        this.scene.add(hitbox);
        this.debugObjects.push(hitbox);
        
        // Add hitboxes for the specific collision parts (pillars and top)
        if (barrier.leftPillarPos) {
            const pillarGeometry = new THREE.CylinderGeometry(0.6, 0.6, 3, 8);
            const pillarMaterial = new THREE.MeshBasicMaterial({
                color: 0xffcc00,
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
            
            // Left pillar
            const leftPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            leftPillar.position.copy(barrier.leftPillarPos);
            this.scene.add(leftPillar);
            this.debugObjects.push(leftPillar);
            
            // Right pillar
            const rightPillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
            rightPillar.position.copy(barrier.rightPillarPos);
            this.scene.add(rightPillar);
            this.debugObjects.push(rightPillar);
            
            // Top section - specific visualization
            const topGeometry = new THREE.BoxGeometry(3, 0.8, 0.8);
            const topMaterial = new THREE.MeshBasicMaterial({
                color: 0xffcc00,
                wireframe: true,
                transparent: true,
                opacity: 0.5
            });
            
            const topSection = new THREE.Mesh(topGeometry, topMaterial);
            topSection.position.copy(barrier.topPos);
            this.scene.add(topSection);
            this.debugObjects.push(topSection);
        }
    }
    
    updateDebugInfo() {
        if (!this.debugMode) return;
        
        // Update hitbox positions
        for (const obj of this.debugObjects) {
            if (obj.userData.entityRef && obj.userData.entityRef.getPosition) {
                obj.position.copy(obj.userData.entityRef.getPosition());
            }
        }
        
        // Calculate FPS
        const now = performance.now();
        this.frames++;
        
        if (now - this.lastFpsUpdate > 1000) {
            this.fps = Math.round((this.frames * 1000) / (now - this.lastFpsUpdate));
            this.lastFpsUpdate = now;
            this.frames = 0;
        }
        
        // Get detailed player debug info
        const playerInfo = this.player.getDebugInfo();
        
        // Update debug info text
        let debugText = '';
        debugText += `FPS: ${this.fps}\n`;
        debugText += `Game State: ${this.gameStarted ? 'RUNNING' : 'PAUSED'}\n`;
        debugText += `Slow Motion: ${this.slowMotion ? 'ON' : 'OFF'}\n`;
        debugText += '----------\n';
        debugText += `Level: ${this.level}\n`;
        debugText += `Score: ${this.score}\n`;
        debugText += `Lives: ${this.lives}\n`;
        debugText += '----------\n';
        debugText += `Enemies: ${this.enemies.length}\n`;
        debugText += `Player Bullets: ${this.playerBullets.length}\n`;
        debugText += `Enemy Bullets: ${this.enemyBullets.length}\n`;
        debugText += '----------\n';
        debugText += `Player Position: ${this.formatVector(this.player.getPosition())}\n`;
        debugText += `Player Invulnerable: ${playerInfo.isInvulnerable ? 'YES' : 'NO'}\n`;
        debugText += `Shots Fired: ${playerInfo.shotsFired}\n`;
        debugText += `Times Hit: ${playerInfo.timesHit}\n`;
        debugText += `Distance Moved: ${playerInfo.distanceMoved}u\n`;
        debugText += '----------\n';
        debugText += `Camera: ${this.formatVector(this.camera.position)}\n`;
        debugText += '\nKeyboard Shortcuts:\n';
        debugText += '` - Toggle debug mode\n';
        debugText += 'i - Toggle invincibility\n';
        debugText += 'c - Clear enemies\n';
        debugText += 'n - Next level\n';
        debugText += 'p - Pause/resume\n';
        debugText += 's - Slow motion\n';
        
        this.debugInfoPanel.textContent = debugText;
    }
    
    formatVector(vector) {
        return `x:${vector.x.toFixed(2)}, y:${vector.y.toFixed(2)}, z:${vector.z.toFixed(2)}`;
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

        // Check for victory at level 20
        if (this.level > 20) {
            this.showVictoryScreen();
            return;
        }

        // Check for boss level (every 5 levels)
        if (this.level % 5 === 0) {
            this.createBossLevel();
        } else {
            this.createStandardLevel();
        }

        // Create barriers - maintain same spacing and count
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

    createStandardLevel() {
        // Standard level with enemy formation
        const enemyRows = Math.min(4 + Math.floor(this.level / 3), 6); // Cap at 6 rows
        const enemyCols = Math.min(5 + Math.floor(this.level / 4), 8); // Cap at 8 columns
        
        // Keep spacing consistent regardless of level
        const enemySpacing = 5;
        const enemyRowSpacing = 3;
        const enemyOffset = -(enemyCols * enemySpacing) / 2 + enemySpacing/2;
        
        // Create a formation with a consistent height
        const startingHeight = 15;

        for (let row = 0; row < enemyRows; row++) {
            for (let col = 0; col < enemyCols; col++) {
                const enemy = new Enemy(this.scene, row, col);
                
                // Position with consistent spacing
                enemy.model.position.x = enemyOffset + (col * enemySpacing);
                enemy.model.position.y = startingHeight - (row * enemyRowSpacing);
                
                // Increase difficulty with level progression
                const levelProgression = Math.min(this.level / 10, 1); // 0-1 based on level
                
                // Adjust enemy properties based on level
                enemy.amplitude = 0.02 + (levelProgression * 0.03); // 0.02 to 0.05
                enemy.frequency = 1 + (levelProgression * 1.5);     // 1 to 2.5
                enemy.shootingInterval = 5000 - (levelProgression * 3000); // 5000 to 2000ms
                
                this.enemies.push(enemy);
            }
        }
    }

    createBossLevel() {
        // Create a boss enemy for level 5, 10, 15, 20
        const bossLevel = this.level / 5;
        
        // Create the boss using the dedicated Boss class
        const boss = new Boss(this.scene, bossLevel);
        this.enemies.push(boss);
        
        // For higher boss levels, add some minions
        if (bossLevel >= 2) {
            const minionCount = bossLevel * 2;
            const minionSpacing = 6;
            const minionOffset = -(minionCount * minionSpacing) / 2 + minionSpacing/2;
            
            for (let i = 0; i < minionCount; i++) {
                const minion = new Enemy(this.scene, 1, i);
                minion.model.position.x = minionOffset + (i * minionSpacing);
                minion.model.position.y = 10;
                minion.amplitude = 0.03;
                minion.frequency = 1.5;
                this.enemies.push(minion);
            }
        }
    }

    showVictoryScreen() {
        this.gameStarted = false;
        
        // Create victory screen if it doesn't exist
        if (!document.getElementById('victory-screen')) {
            const victoryScreen = document.createElement('div');
            victoryScreen.id = 'victory-screen';
            victoryScreen.className = 'overlay';
            victoryScreen.style.display = 'flex';
            
            victoryScreen.innerHTML = `
                <h1>CONGRATULATIONS!</h1>
                <div class="menu-content">
                    <div>You have completed all 20 levels!</div>
                    <div id="final-victory-score">FINAL SCORE: ${this.score}</div>
                    <button id="play-again-button">PLAY AGAIN</button>
                </div>
            `;
            
            document.getElementById('game-container').appendChild(victoryScreen);
            
            document.getElementById('play-again-button').addEventListener('click', () => {
                victoryScreen.style.display = 'none';
                location.reload();
            });
        } else {
            // Update existing victory screen
            document.getElementById('final-victory-score').textContent = `FINAL SCORE: ${this.score}`;
            document.getElementById('victory-screen').style.display = 'flex';
        }
        
        // Update high score if current score is higher
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('highScore', this.highScore);
            document.getElementById('high-score').textContent = `HIGH SCORE: ${this.highScore}`;
        }
    }

    setupEventListeners() {
        this.keys = {};
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            
            // Debug keyboard shortcuts
            if (this.debugMode) {
                // D + I = Toggle invincibility
                if (e.key === 'i') {
                    this.player.isInvulnerable = !this.player.isInvulnerable;
                    console.log(`Player invincibility: ${this.player.isInvulnerable ? 'ON' : 'OFF'}`);
                }
                
                // D + C = Clear all enemies
                if (e.key === 'c') {
                    for (const enemy of this.enemies) {
                        enemy.remove();
                    }
                    this.enemies = [];
                }
                
                // D + N = Next level
                if (e.key === 'n') {
                    this.level++;
                    this.updateHUD();
                    this.createLevel();
                    this.clearDebugVisualizations();
                    this.createDebugVisualizations();
                }
                
                // D + P = Pause/resume game
                if (e.key === 'p') {
                    this.gameStarted = !this.gameStarted;
                    console.log(`Game ${this.gameStarted ? 'resumed' : 'paused'}`);
                }
                
                // D + S = Slow motion (half speed)
                if (e.key === 's') {
                    if (!this.slowMotion) {
                        GAME_CONFIG.BULLET_SPEED /= 2;
                        this.slowMotion = true;
                        console.log('Slow motion ON');
                    } else {
                        GAME_CONFIG.BULLET_SPEED *= 2;
                        this.slowMotion = false;
                        console.log('Slow motion OFF');
                    }
                }
            }
            
            // Toggle debug mode with backtick key
            if (e.key === '`') {
                const debugCheckbox = document.getElementById('debug-mode');
                debugCheckbox.checked = !debugCheckbox.checked;
                this.toggleDebugMode(debugCheckbox.checked);
            }
        });
        window.addEventListener('keyup', (e) => this.keys[e.key] = false);
        window.addEventListener('resize', () => this.handleResize());

        const startButton = document.getElementById('start-button');
        const menuElement = document.getElementById('menu');
        const nextLevelButton = document.getElementById('next-level-button');
        const restartButton = document.getElementById('restart-button');

        startButton.addEventListener('click', () => {
            menuElement.style.display = 'none';
            this.gameStarted = true;
            document.querySelector('.credits').classList.add('hidden');
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
            document.querySelector('.credits').classList.remove('hidden');
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
        
        // Debug mode toggle
        const debugModeCheckbox = document.getElementById('debug-mode');
        debugModeCheckbox.addEventListener('change', (e) => {
            this.toggleDebugMode(e.target.checked);
        });
        
        // Debug buttons
        document.getElementById('debug-invincible').addEventListener('click', () => {
            if (this.player) {
                this.player.isInvulnerable = !this.player.isInvulnerable;
                alert(`Player invincibility: ${this.player.isInvulnerable ? 'ON' : 'OFF'}`);
            }
        });
        
        document.getElementById('debug-clear-enemies').addEventListener('click', () => {
            for (const enemy of this.enemies) {
                enemy.remove();
            }
            this.enemies = [];
        });
        
        document.getElementById('debug-next-level').addEventListener('click', () => {
            this.level++;
            this.updateHUD();
            this.createLevel();
            if (this.debugMode) {
                this.clearDebugVisualizations();
                this.createDebugVisualizations();
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
        if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
            this.player.move('left');
        }
        if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
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
            const bullets = randomEnemy.shoot();
            
            if (bullets) {
                // Handle multiple bullets (for boss multi-shot)
                if (Array.isArray(bullets)) {
                    bullets.forEach(bullet => this.enemyBullets.push(bullet));
                } else {
                    this.enemyBullets.push(bullets);
                }
            }
        }

        this.updateBullets();

        // Animate enemies
        const time = Date.now() * 0.001;
        
        // Define the danger zone - position where enemies are too close to barriers
        const dangerZoneY = 0; // Position just above the barriers
        let enemyInDangerZone = false;
        
        this.enemies.forEach(enemy => {
            enemy.move(time);
            
            // Skip danger zone check for bosses (they stay at the top)
            if (enemy.isBoss) return;
            
            // Game over if enemies reach close to the barriers or below
            if (enemy.model.position.y < dangerZoneY) {
                enemyInDangerZone = true;
            }
            
            // Game over if enemies reach the bottom (player position)
            if (enemy.model.position.y < -5) {
                this.showGameOver();
                return;
            }
        });
        
        // If any enemy is in the danger zone, it's game over
        if (enemyInDangerZone) {
            this.showGameOver();
            return;
        }

        // Check level complete
        if (this.enemies.length === 0) {
            this.showLevelComplete();
        }
        
        // Update debug info
        this.updateDebugInfo();
    }

    updateBullets() {
        // Update player bullets
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const bullet = this.playerBullets[i];
            
            // Track bullet position for debug mode
            if (this.debugMode && !bullet.userData.trail) {
                this.createBulletTrail(bullet, 0xffff00);
            }
            
            bullet.position.y += GAME_CONFIG.BULLET_SPEED;
            bullet.position.z = 0; // Ensure bullet stays in the same plane
            
            // Update bullet trail in debug mode
            if (this.debugMode && bullet.userData.trail) {
                this.updateBulletTrail(bullet);
            }
            
            // Check for enemy collisions first
            let bulletHitEnemy = false;
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                const distance = bullet.position.distanceTo(enemy.getPosition());
                if (distance < enemy.hitboxRadius) {
                    this.scene.remove(bullet);
                    this.playerBullets.splice(i, 1);
                    
                    // Handle boss with multiple health points
                    const isDestroyed = enemy.takeDamage(1);
                    
                    if (isDestroyed) {
                        enemy.remove();
                        this.enemies.splice(j, 1);
                        // Award points based on enemy value
                        this.score += enemy.pointValue || 100;
                        this.updateHUD();
                    } else if (enemy.isBoss) {
                        // Visual feedback but don't remove the boss
                        this.score += 10; // Small points for hitting (not killing) the boss
                        this.updateHUD();
                    }
                    
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
            
            // Track bullet position for debug mode
            if (this.debugMode && !bullet.userData.trail) {
                this.createBulletTrail(bullet, 0xff0000);
            }
            
            // Handle special attack bullets
            if (bullet.userData && bullet.userData.isSpecialAttack) {
                this.updateSpecialAttackBullet(bullet, i);
                continue;
            }
            
            bullet.position.y -= GAME_CONFIG.BULLET_SPEED;
            bullet.position.z = 0; // Ensure bullet stays in the same plane
            
            // Update bullet trail in debug mode
            if (this.debugMode && bullet.userData.trail) {
                this.updateBulletTrail(bullet);
            }
            
            // Check player collision first
            const playerDistance = bullet.position.distanceTo(this.player.getPosition());
            if (playerDistance < this.player.hitboxRadius) {
                this.scene.remove(bullet);
                this.enemyBullets.splice(i, 1);
                
                // Only decrease lives if player is not invulnerable
                if (this.player.hit()) {
                    // Boss bullets can do more damage
                    const damage = bullet.userData && bullet.userData.isBossBullet ? 
                                  bullet.userData.bossLevel || 1 : 1;
                    
                    this.lives -= damage;
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
    
    updateSpecialAttackBullet(bullet, index) {
        // Handle different types of special attacks
        
        // Laser beam type attacks
        if (bullet.userData.duration) {
            bullet.userData.duration--;
            
            // Check player collision with laser beam
            const playerPos = this.player.getPosition();
            if (Math.abs(playerPos.x - bullet.position.x) < 1 && 
                playerPos.y < bullet.position.y + 10 && 
                playerPos.y > bullet.position.y - 10) {
                
                // Player hit by laser
                if (this.player.hit()) {
                    this.lives -= bullet.userData.damage || 1;
                    this.updateHUD();
                    
                    if (this.lives <= 0) {
                        this.showGameOver();
                        return;
                    }
                }
            }
            
            // Remove laser after duration expires
            if (bullet.userData.duration <= 0) {
                this.scene.remove(bullet);
                this.enemyBullets.splice(index, 1);
            }
            return;
        }
        
        // Circular pattern bullets
        if (bullet.userData.angle !== undefined) {
            const angle = bullet.userData.angle;
            const speed = bullet.userData.speed || 0.2;
            const radius = bullet.userData.radius || 3;
            
            // Update angle
            bullet.userData.angle += speed * 0.05;
            
            // Move in spiral pattern
            bullet.position.x = bullet.userData.originX || 
                (bullet.position.x - Math.cos(angle) * radius);
            bullet.position.y -= speed;
            
            bullet.userData.originX = bullet.userData.originX || bullet.position.x;
            bullet.position.x += Math.cos(bullet.userData.angle) * radius;
            
            // Update bullet trail in debug mode
            if (this.debugMode && bullet.userData.trail) {
                this.updateBulletTrail(bullet);
            }
            
            // Check player collision
            const playerDistance = bullet.position.distanceTo(this.player.getPosition());
            if (playerDistance < this.player.hitboxRadius) {
                this.scene.remove(bullet);
                this.enemyBullets.splice(index, 1);
                
                // Only decrease lives if player is not invulnerable
                if (this.player.hit()) {
                    this.lives--;
                    this.updateHUD();
                    
                    if (this.lives <= 0) {
                        this.showGameOver();
                        return;
                    }
                }
                return;
            }
            
            // Check barrier collision
            for (const barrier of this.barriers) {
                const collision = barrier.checkBulletCollision(bullet);
                if (collision.hit) {
                    this.scene.remove(bullet);
                    this.enemyBullets.splice(index, 1);
                    return;
                }
            }
            
            // Remove if off-screen
            if (bullet.position.y < -10) {
                this.scene.remove(bullet);
                this.enemyBullets.splice(index, 1);
            }
        }
    }
    
    createBulletTrail(bullet, color) {
        // Create a line to show bullet trajectory
        const material = new THREE.LineBasicMaterial({ color: color });
        const geometry = new THREE.BufferGeometry();
        
        // Set initial points (just the current position twice)
        const points = [
            bullet.position.clone(),
            bullet.position.clone()
        ];
        
        geometry.setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        
        // Store reference to the trail and points array
        bullet.userData.trail = line;
        bullet.userData.trailPoints = points;
        bullet.userData.maxTrailLength = 20; // Maximum number of points to keep
        
        this.debugObjects.push(line);
    }
    
    updateBulletTrail(bullet) {
        if (!bullet.userData.trail || !bullet.userData.trailPoints) return;
        
        // Add current position to trail
        bullet.userData.trailPoints.push(bullet.position.clone());
        
        // Limit trail length
        if (bullet.userData.trailPoints.length > bullet.userData.maxTrailLength) {
            bullet.userData.trailPoints.shift(); // Remove oldest point
        }
        
        // Update line geometry
        const geometry = new THREE.BufferGeometry().setFromPoints(bullet.userData.trailPoints);
        bullet.userData.trail.geometry.dispose();
        bullet.userData.trail.geometry = geometry;
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