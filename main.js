import * as THREE from "/node_modules/three/build/three.module.js";
import { Player } from "./models/Player.js";
import { Enemy } from "./models/Enemy.js";
import { Boss } from "./models/Boss.js";
import { Barrier } from "./models/Barrier.js";
import { GAME_CONFIG } from "./utils/constants.js";
import { MotherShip } from "./models/MotherShip.js";

class SpaceInvaders {
  constructor() {
    this.setupScene();
    this.levelTransitionActive = false; // estamos a mostrar a animação?
    this.transitionStartTime = 0; // carimbo de arranque
    this.transitionDuration = 3000; // ms de duração total
    this.transitionPhase = 0; // 0=círculo, 1=entrada na mothership
    this.mothership = null; // Mesh da nave-mãe
    this.playerStart = null; // pontos do arco
    this.playerMid = null;
    this.playerFinal = null;
    this.shipSelectionActive = false;
    this.availableShips = []; // Meshes das naves de escolha
    this.selectedShipIndex = null; // Índice da nave clicada
    this.chosenShip = null; // referência à nave seleccionada
    this.setupLighting();
    this.setupGame();
    this.setupDebugMode();
    this.setupEventListeners();
    this.setupLightControls();
    if (sessionStorage.getItem("autoStart") === "1") {
      sessionStorage.removeItem("autoStart");
      this.selectedShipIndex = 0; // ou qualquer nave por defeito
      this.finaliseSelection(); // salta menu de naves
    }
    this.animate();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById("game-canvas"),
      antialias: true,
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
      color: 0xffffff,
      size: 0.2,
      transparent: true,
    });

    const starsVertices = [];

    // Create random stars
    for (let i = 0; i < 1000; i++) {
      const x = (Math.random() - 0.5) * 200;
      const y = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 100 - 50;
      starsVertices.push(x, y, z);
    }

    starsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starsVertices, 3)
    );
    this.starfield = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.starfield);

    // Add a subtle blue nebula effect
    const nebulaTexture = new THREE.TextureLoader().load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png"
    );
    const nebulaMaterial = new THREE.SpriteMaterial({
      map: nebulaTexture,
      color: 0x0066ff,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < 20; i++) {
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

  createSun() {
    // Glowing sun sphere
    const sunGeometry = new THREE.SphereGeometry(2, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdd66,
      emissive: 0xffaa00,
      emissiveIntensity: 2.5,
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(-10, 20, 10);
    this.scene.add(sun);

    // Directional sunlight
    const sunlight = new THREE.DirectionalLight(0xffddaa, 2);
    sunlight.position.set(-10, 20, 10);
    sunlight.castShadow = true;

    // 💡 Point the light at the scene's center
    sunlight.target.position.set(-0.16, -10);
    this.scene.add(sunlight.target); // Required!

    this.scene.add(sunlight);
    sunlight.name = "sun";

    // Optional helper
    // const helper = new THREE.DirectionalLightHelper(sunlight, 5);
    //this.scene.add(helper);
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(-0.16, -10);
    this.scene.add(directionalLight);

    ambientLight.name = "ambient";
    directionalLight.name = "directional";

    this.createSun();
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
    this.highScore = parseInt(localStorage.getItem("highScore")) || 0;
    this.highestLevel = parseInt(localStorage.getItem("highestLevel")) || 1;

    // Debug properties
    this.debugMode = false;
    this.debugObjects = [];
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.fps = 0;

    // Update displays
    document.getElementById(
      "high-score"
    ).textContent = `HIGH SCORE: ${this.highScore}`;
    document.getElementById(
      "highest-level"
    ).textContent = `HIGHEST LEVEL: ${this.highestLevel}`;
    this.updateHUD();
  }

  setupDebugMode() {
    this.debugInfoPanel = document.getElementById("debug-info");
    this.debugPanel = document.getElementById("debug-panel");

    // Frame counter for FPS calculation
    this.frames = 0;
    this.lastFpsUpdate = 0;
  }

  toggleDebugMode(enable) {
    this.debugMode = enable;
    this.debugPanel.style.display = enable ? "block" : "none";

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
      opacity: 0.5,
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
      opacity: 0.5,
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
        opacity: 0.5,
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
        opacity: 0.5,
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
    let debugText = "";
    debugText += `FPS: ${this.fps}\n`;
    debugText += `Game State: ${this.gameStarted ? "RUNNING" : "PAUSED"}\n`;
    debugText += `Slow Motion: ${this.slowMotion ? "ON" : "OFF"}\n`;
    debugText += "----------\n";
    debugText += `Level: ${this.level}\n`;
    debugText += `Score: ${this.score}\n`;
    debugText += `Lives: ${this.lives}\n`;
    debugText += "----------\n";
    debugText += `Enemies: ${this.enemies.length}\n`;
    debugText += `Player Bullets: ${this.playerBullets.length}\n`;
    debugText += `Enemy Bullets: ${this.enemyBullets.length}\n`;
    debugText += "----------\n";
    debugText += `Player Position: ${this.formatVector(
      this.player.getPosition()
    )}\n`;
    debugText += `Player Invulnerable: ${
      playerInfo.isInvulnerable ? "YES" : "NO"
    }\n`;
    debugText += `Shots Fired: ${playerInfo.shotsFired}\n`;
    debugText += `Times Hit: ${playerInfo.timesHit}\n`;
    debugText += `Distance Moved: ${playerInfo.distanceMoved}u\n`;
    debugText += "----------\n";
    debugText += `Camera: ${this.formatVector(this.camera.position)}\n`;
    debugText += "\nKeyboard Shortcuts:\n";
    debugText += "` - Toggle debug mode\n";
    debugText += "i - Toggle invincibility\n";
    debugText += "c - Clear enemies\n";
    debugText += "n - Next level\n";
    debugText += "p - Pause/resume\n";
    debugText += "s - Slow motion\n";

    this.debugInfoPanel.textContent = debugText;
  }

  formatVector(vector) {
    return `x:${vector.x.toFixed(2)}, y:${vector.y.toFixed(
      2
    )}, z:${vector.z.toFixed(2)}`;
  }

  createLevel() {
    // Clear any existing enemies and barriers
    this.enemies.forEach((enemy) => enemy.remove());
    this.barriers.forEach((barrier) => barrier.remove());
    this.enemies = [];
    this.barriers = [];

    // Remove any existing bullets
    this.playerBullets.forEach((bullet) => this.scene.remove(bullet));
    this.enemyBullets.forEach((bullet) => this.scene.remove(bullet));
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
    const barrierOffset =
      -(GAME_CONFIG.BARRIER_COUNT * barrierSpacing) / 2 + barrierSpacing / 2;

    for (let i = 0; i < GAME_CONFIG.BARRIER_COUNT; i++) {
      const position = new THREE.Vector3(
        barrierOffset + i * barrierSpacing,
        -2,
        0
      );
      this.barriers.push(new Barrier(this.scene, position));
    }
  }
  /*  -------- RESET SEM RELOAD --------- */
  resetToLevel1() {
    // 1. limpar arrays e cenas visuais
    this.enemies.forEach((e) => e.remove());
    this.barriers.forEach((b) => b.remove());
    this.playerBullets.forEach((b) => this.scene.remove(b));
    this.enemyBullets.forEach((b) => this.scene.remove(b));
    this.enemies = [];
    this.barriers = [];
    this.playerBullets = [];
    this.enemyBullets = [];

    // 2. estado base
    this.level = 1;
    this.score = 0;
    this.lives = 3;

    // 3. HUD
    this.updateHUD();

    // 4. recria o nível 1
    this.createLevel();

    // 5. fecha eventuais sobreposições
    document.getElementById("game-over").style.display = "none";
    document.getElementById("pause-menu").style.display = "none";
    document.getElementById("level-complete").style.display = "none";

    this.gameStarted = true;
  }
  /*  -------- FIM RESET --------- */

  createStandardLevel() {
    // Standard level with enemy formation
    const enemyRows = Math.min(4 + Math.floor(this.level / 3), 6); // Cap at 6 rows
    const enemyCols = Math.min(5 + Math.floor(this.level / 4), 8); // Cap at 8 columns

    // Keep spacing consistent regardless of level
    const enemySpacing = 5;
    const enemyRowSpacing = 3;
    const enemyOffset = -(enemyCols * enemySpacing) / 2 + enemySpacing / 2;

    // Create a formation with a consistent height
    const startingHeight = 15;

    for (let row = 0; row < enemyRows; row++) {
      for (let col = 0; col < enemyCols; col++) {
        const enemy = new Enemy(this.scene, row, col);

        // Position with consistent spacing
        enemy.model.position.x = enemyOffset + col * enemySpacing;
        enemy.model.position.y = startingHeight - row * enemyRowSpacing;

        // Increase difficulty with level progression
        const levelProgression = Math.min(this.level / 10, 1); // 0-1 based on level

        // Adjust enemy properties based on level
        enemy.amplitude = 0.02 + levelProgression * 0.03; // 0.02 to 0.05
        enemy.frequency = 1 + levelProgression * 1.5; // 1 to 2.5
        enemy.shootingInterval = 5000 - levelProgression * 3000; // 5000 to 2000ms

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
      const minionOffset =
        -(minionCount * minionSpacing) / 2 + minionSpacing / 2;

      for (let i = 0; i < minionCount; i++) {
        const minion = new Enemy(this.scene, 1, i);
        minion.model.position.x = minionOffset + i * minionSpacing;
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
    if (!document.getElementById("victory-screen")) {
      const victoryScreen = document.createElement("div");
      victoryScreen.id = "victory-screen";
      victoryScreen.className = "overlay";
      victoryScreen.style.display = "flex";

      victoryScreen.innerHTML = `
                <h1>CONGRATULATIONS!</h1>
                <div class="menu-content">
                    <div>You have completed all 20 levels!</div>
                    <div id="final-victory-score">FINAL SCORE: ${this.score}</div>
                    <button id="play-again-button">PLAY AGAIN</button>
                </div>
            `;

      document.getElementById("game-container").appendChild(victoryScreen);

      document
        .getElementById("play-again-button")
        .addEventListener("click", () => {
          victoryScreen.style.display = "none";
          location.reload();
        });
    } else {
      // Update existing victory screen
      document.getElementById(
        "final-victory-score"
      ).textContent = `FINAL SCORE: ${this.score}`;
      document.getElementById("victory-screen").style.display = "flex";
    }

    // Update high score if current score is higher
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("highScore", this.highScore);
      document.getElementById(
        "high-score"
      ).textContent = `HIGH SCORE: ${this.highScore}`;
    }
  }
  /* ---------- MENU DE NAVE ---------- */
  startShipSelection() {
    this.shipSelectionActive = true;
    document.getElementById("ship-selection").style.display = "flex";

    const shipCount = 4; // quantas opções mostrar
    const spacing = 8; // distância entre elas
    const yPos = 0; // altura da fila

    this.availableShips = []; // (re)inicia o array

    for (let i = 0; i < shipCount; i++) {
      const p = new Player(this.scene, i); // styleIndex = i
      p.model.position.set(
        (i - (shipCount - 1) / 2) * spacing, // X em linha
        yPos,
        0 // Z = 0 (mesmo plano)
      );
      p.model.rotation.x = -Math.PI * 0.1; // ligeiro tilt
      p.model.userData.selfSpin = true; // vai girar sobre si
      this.availableShips.push(p.model);
    }

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    window.addEventListener("click", (e) => this.handleShipClick(e));

    /* não há órbita — por isso já não precisamos de shipOrbitActive */
    this.chosenShip = null;
    document.getElementById("hud").style.display = "none";
  }

  handleShipClick(event) {
    if (!this.shipSelectionActive) return;

    // Converter posição do rato para NDC
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const hits = this.raycaster.intersectObjects(this.availableShips, true);
    if (hits.length) this.chooseShip(hits[0].object);
  }

  chooseShip(mesh) {
    const ship = this.availableShips.find(
      (s) => mesh === s || mesh.parent === s
    );
    this.selectedShipIndex = this.availableShips.indexOf(ship);
    this.chosenShip = ship;

    // pára rotação das restantes
    this.availableShips.forEach((s) => {
      s.userData.selfSpin = false;
    });
    ship.userData.selfSpin = true; // opcional: a escolhida continua a girar

    // destino da câmara
    const target = new THREE.Vector3(
      ship.position.x,
      ship.position.y + 2,
      ship.position.z + 6
    );
    this.cameraLerp = {
      start: this.camera.position.clone(),
      end: target,
      t: 0,
    };

    document.getElementById("confirm-ship").style.display = "block";
  }

  finaliseSelection() {
    /* 2. remove o Player "placeholder" criado no setupGame() */
    if (this.player && this.player.model) {
      this.scene.remove(this.player.model);
    }

    /* 3. cria o jogador definitivo com a skin escolhida */
    this.player = new Player(this.scene, this.selectedShipIndex);

    /* 4. limpa naves de escolha */
    this.availableShips.forEach((s) => this.scene.remove(s));
    this.availableShips = [];
    this.chosenShip = null;
    this.shipSelectionActive = false;

    /* 5. câmara volta à posição de jogo (UMA única vez) */
    const mode = document.getElementById("game-mode").value;
    if (mode === "action-cam") {
      // vista 3D inclinada
      this.camera.position.set(0, -12, 15);
      this.camera.lookAt(0, 5, 0);
    } else {
      // vista 2D clássica
      this.camera.position.set(0, 0, 30);
      this.camera.lookAt(0, 0, 0);
    }

    /* 6. arranca nível 1 */
    this.level = 1;
    this.createLevel();
    this.gameStarted = true;
    document.getElementById("hud").style.display = "block";
  }

  /* ---------- FIM MENU DE NAVE ---------- */

  setupEventListeners() {
    this.keys = {};
    window.addEventListener("keydown", (e) => {
      this.keys[e.key] = true;
      // ...já existe this.keys[e.key] = true;
      if (e.key === "Escape") {
        // Se o jogo estiver a correr, abre o menu de pausa
        if (this.gameStarted) {
          this.togglePauseMenu(true);
        } else {
          // Se o menu de pausa estiver aberto, fecha-o e continua
          const pauseOpen =
            document.getElementById("pause-menu").style.display === "flex";
          if (pauseOpen) this.togglePauseMenu(false);
        }
      }

      // Debug keyboard shortcuts
      if (this.debugMode) {
        // D + I = Toggle invincibility
        if (e.key === "i") {
          this.player.isInvulnerable = !this.player.isInvulnerable;
          console.log(
            `Player invincibility: ${this.player.isInvulnerable ? "ON" : "OFF"}`
          );
        }

        // D + C = Clear all enemies
        if (e.key === "c") {
          for (const enemy of this.enemies) {
            enemy.remove();
          }
          this.enemies = [];
        }

        // D + N = Next level
        if (e.key === "n") {
          this.level++;
          this.updateHUD();
          this.createLevel();
          this.clearDebugVisualizations();
          this.createDebugVisualizations();
        }

        // D + P = Pause/resume game
        if (e.key === "p") {
          this.gameStarted = !this.gameStarted;
          console.log(`Game ${this.gameStarted ? "resumed" : "paused"}`);
        }

        // D + S = Slow motion (half speed)
        if (e.key === "s") {
          if (!this.slowMotion) {
            GAME_CONFIG.BULLET_SPEED /= 2;
            this.slowMotion = true;
            console.log("Slow motion ON");
          } else {
            GAME_CONFIG.BULLET_SPEED *= 2;
            this.slowMotion = false;
            console.log("Slow motion OFF");
          }
        }
      }

      // Toggle debug mode with backtick key
      if (e.key === "`") {
        const debugCheckbox = document.getElementById("debug-mode");
        debugCheckbox.checked = !debugCheckbox.checked;
        this.toggleDebugMode(debugCheckbox.checked);
      }
    });
    window.addEventListener("keyup", (e) => (this.keys[e.key] = false));
    window.addEventListener("resize", () => this.handleResize());

    const startButton = document.getElementById("start-button");
    const menuElement = document.getElementById("menu");
    const nextLevelButton = document.getElementById("next-level-button");
    const restartButton = document.getElementById("restart-button");
    const resumeButton = document.getElementById("resume-button");
    const mainMenuButton = document.getElementById("main-menu-button");
    const restartButtonPause = document.getElementById("restart-button-pause");

    startButton.addEventListener("click", () => {
      menuElement.style.display = "none";
      document.querySelector(".credits").classList.add("hidden");
      this.startShipSelection(); // <<< novo fluxo
    });

    document.getElementById("confirm-ship").addEventListener("click", () => {
      document.getElementById("ship-selection").style.display = "none";
      this.finaliseSelection(); // cria o Player definitivo e arranca o nível 1
    });

    nextLevelButton.addEventListener("click", () => {
      document.getElementById("level-complete").style.display = "none";
      this.level++;
      this.updateHUD();
      this.createLevel();
      this.gameStarted = true;
    });

    restartButton.addEventListener("click", () => {
      this.resetToLevel1();
    });
    resumeButton.addEventListener("click", () => {
      this.togglePauseMenu(false);
    });

    mainMenuButton.addEventListener("click", () => {
      location.reload(); // recarrega tudo e volta ao menu inicial
    });

    restartButtonPause.addEventListener("click", () => {
      this.resetToLevel1();
    });

    document.getElementById("game-mode").addEventListener("change", (e) => {
      const playerPos = this.player.getPosition();
      if (e.target.value === "action-cam") {
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
    const debugModeCheckbox = document.getElementById("debug-mode");
    debugModeCheckbox.addEventListener("change", (e) => {
      this.toggleDebugMode(e.target.checked);
    });

    // Debug buttons
    document
      .getElementById("debug-invincible")
      .addEventListener("click", () => {
        if (this.player) {
          this.player.isInvulnerable = !this.player.isInvulnerable;
          alert(
            `Player invincibility: ${this.player.isInvulnerable ? "ON" : "OFF"}`
          );
        }
      });

    document
      .getElementById("debug-clear-enemies")
      .addEventListener("click", () => {
        for (const enemy of this.enemies) {
          enemy.remove();
        }
        this.enemies = [];
      });

    document
      .getElementById("debug-next-level")
      .addEventListener("click", () => {
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
    // Se estamos no ecrã de escolha, só roda as naves
    if (this.shipSelectionActive) {
      // Enquanto ninguém escolheu, todas giram sobre si próprias
      if (!this.chosenShip) {
        this.availableShips.forEach((s) => {
          if (s.userData.selfSpin) s.rotation.y += 0.05;
        });
      } else {
        // Depois da escolha, só a nave seleccionada roda
        this.chosenShip.rotation.y += 0.05;
      }

      // Animação de câmara (lerp) se existir
      if (this.cameraLerp) {
        this.cameraLerp.t += 0.03;
        if (this.cameraLerp.t >= 1) {
          this.camera.position.copy(this.cameraLerp.end);
          this.cameraLerp = null;
        } else {
          this.camera.position.lerpVectors(
            this.cameraLerp.start,
            this.cameraLerp.end,
            this.cameraLerp.t
          );
        }
        this.camera.lookAt(
          this.chosenShip
            ? this.chosenShip.position
            : new THREE.Vector3(0, 0, 0)
        );
      }

      return; // não executa lógica do jogo
    }

    /* ---------- cut-scene em curso ---------- */
    /* ---------- MINI-FILME ENTRE NÍVEIS ---------- */
    if (this.levelTransitionActive) {
      const now = performance.now();
      const t = (now - this.transitionStartTime) / this.transitionDuration;

      if (this.transitionPhase === 0) {
        // ── fase do círculo (0–0.6)
        const k = Math.min(t / 0.6, 1); // normaliza 0→1 nos 60 %
        const angle = k * Math.PI * 2; // volta completa
        this.player.model.position.set(
          this.circleCenter.x + this.circleRadius * Math.cos(angle),
          this.circleCenter.y + 2 * Math.sin(angle), // pequena oscilação
          0
        );
        this.player.model.rotation.y += 0.25;

        if (k >= 1) {
          // mudou para fase 1
          this.transitionPhase = 1;
          this.phase1StartTime = now;
        }
      } else {
        // ── fase de entrada (restantes 40 %)
        const k = Math.min((now - this.phase1StartTime) / 2000, 1); // 2 s
        const pos = this.player.model.position;
        pos.lerpVectors(pos, this.entryPoint, k); // aproximação linear
        this.player.model.rotation.y += 0.15;

        /* pulsar da mothership */
        this.mothership.material.emissiveIntensity =
          0.5 + 0.5 * Math.sin(k * Math.PI * 4);

        if (k >= 1) this.endLevelTransition();
      }

      this.renderer.render(this.scene, this.camera);
      return; // tudo parado fora da cena
    }

    if (!this.gameStarted) return;

    // Rotate starfield slightly for subtle movement
    if (this.starfield) {
      this.starfield.rotation.z += 0.0001;
    }

    // Player movement
    if (this.keys["ArrowLeft"] || this.keys["a"] || this.keys["A"]) {
      this.player.move("left");
    }
    if (this.keys["ArrowRight"] || this.keys["d"] || this.keys["D"]) {
      this.player.move("right");
    }
    if (this.keys[" "] || this.keys["Enter"]) {
      const bullet = this.player.shoot();
      if (bullet) this.playerBullets.push(bullet);
    }

    // Update camera to follow player based on current view mode
    const playerPos = this.player.getPosition();
    const gameMode = document.getElementById("game-mode").value;

    if (gameMode === "action-cam") {
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
      const randomEnemy =
        this.enemies[Math.floor(Math.random() * this.enemies.length)];
      const bullets = randomEnemy.shoot();

      if (bullets) {
        // Handle multiple bullets (for boss multi-shot)
        if (Array.isArray(bullets)) {
          bullets.forEach((bullet) => this.enemyBullets.push(bullet));
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

    this.enemies.forEach((enemy) => {
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
      const playerDistance = bullet.position.distanceTo(
        this.player.getPosition()
      );
      if (playerDistance < this.player.hitboxRadius) {
        this.scene.remove(bullet);
        this.enemyBullets.splice(i, 1);

        // Only decrease lives if player is not invulnerable
        if (this.player.hit()) {
          // Boss bullets can do more damage
          const damage =
            bullet.userData && bullet.userData.isBossBullet
              ? bullet.userData.bossLevel || 1
              : 1;

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
      if (
        Math.abs(playerPos.x - bullet.position.x) < 1 &&
        playerPos.y < bullet.position.y + 10 &&
        playerPos.y > bullet.position.y - 10
      ) {
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
      bullet.position.x =
        bullet.userData.originX || bullet.position.x - Math.cos(angle) * radius;
      bullet.position.y -= speed;

      bullet.userData.originX = bullet.userData.originX || bullet.position.x;
      bullet.position.x += Math.cos(bullet.userData.angle) * radius;

      // Update bullet trail in debug mode
      if (this.debugMode && bullet.userData.trail) {
        this.updateBulletTrail(bullet);
      }

      // Check player collision
      const playerDistance = bullet.position.distanceTo(
        this.player.getPosition()
      );
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
    const points = [bullet.position.clone(), bullet.position.clone()];

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
    const geometry = new THREE.BufferGeometry().setFromPoints(
      bullet.userData.trailPoints
    );
    bullet.userData.trail.geometry.dispose();
    bullet.userData.trail.geometry = geometry;
  }

  updateHUD() {
    document.getElementById("score").textContent = `SCORE: ${this.score}`;
    document.getElementById("lives").textContent = `LIVES: ${this.lives}`;
    document.getElementById("level").textContent = `LEVEL: ${this.level}`;
  }

  showLevelOverlay() {
    this.gameStarted = false;
    document.getElementById("level-score").textContent = `SCORE: ${this.score}`;
    document.getElementById(
      "current-level"
    ).textContent = `LEVEL: ${this.level}`;
    document.getElementById("level-complete").style.display = "flex";

    // Update highest level if current level is higher
    if (this.level > this.highestLevel) {
      this.highestLevel = this.level;
      localStorage.setItem("highestLevel", this.highestLevel);
      document.getElementById(
        "highest-level"
      ).textContent = `HIGHEST LEVEL: ${this.highestLevel}`;
    }
  }
  // --------- MINI-FILME ENTRE NÍVEIS -----------------
  showLevelComplete() {
    /* 1. pára o jogo e oculta HUD + restos de nível */
    this.levelTransitionActive = true;
    this.gameStarted = false;
    document.getElementById("hud").style.display = "none";

    /* remove barreiras e balas para limpar o ecrã */
    this.barriers.forEach((b) => b.remove());
    this.barriers = [];
    this.playerBullets.forEach((b) => this.scene.remove(b));
    this.enemyBullets.forEach((b) => this.scene.remove(b));
    this.playerBullets = [];
    this.enemyBullets = [];

    /* 2. momento de arranque + duração total */
    this.transitionStartTime = performance.now();
    this.transitionDuration = 5000; // 3 s círculo + 2 s entrada
    this.transitionPhase = 0; // começa no círculo

    /* 3. mothership (disco simples) */
    const g = new THREE.CylinderGeometry(6, 6, 2, 32);
    const m = new THREE.MeshPhongMaterial({
      color: 0x6666ff,
      emissive: 0x222266,
    });
    this.mothership = new THREE.Mesh(g, m);
    this.mothership.position.set(0, 12, 0);
    this.scene.add(this.mothership);

    /* 4. pontos do percurso */
    this.circleRadius = 10;
    this.circleCenter = new THREE.Vector3(0, 2, 0);
    this.entryPoint = new THREE.Vector3(0, 11, 0); // boca da mothership
  }

  // ---------- fim cut-scene ----------
  endLevelTransition() {
    /* remover nave-mãe */
    this.scene.remove(this.mothership);
    this.mothership.geometry.dispose();
    this.mothership.material.dispose();
    this.mothership = null;

    /* recoloca a nave do jogador em baixo */
    this.player.model.position.set(0, -8, 0);
    this.player.model.rotation.set(-Math.PI * 0.1, 0, 0);

    /* mostrar HUD e overlay */
    document.getElementById("hud").style.display = "block";
    this.levelTransitionActive = false;

    /* overlay clássico */
    this.showLevelOverlay();
  }

  showGameOver() {
    this.gameStarted = false;
    document.getElementById(
      "final-score"
    ).textContent = `FINAL SCORE: ${this.score}`;
    document.getElementById(
      "levels-completed"
    ).textContent = `LEVELS COMPLETED: ${this.level - 1}`;
    document.getElementById("game-over").style.display = "flex";

    // Update high score if current score is higher
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("highScore", this.highScore);
      document.getElementById(
        "high-score"
      ).textContent = `HIGH SCORE: ${this.highScore}`;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.update();
    this.renderer.render(this.scene, this.camera);
  }
  togglePauseMenu(show) {
    const pauseEl = document.getElementById("pause-menu");
    pauseEl.style.display = show ? "flex" : "none";
    this.gameStarted = !show; // pára ou retoma o ciclo de update()
  }

  toggleLight(lightName) {
    const light = this.scene.getObjectByName(lightName);
    if (light) {
      light.visible = !light.visible;
      console.log(`${lightName} light is now ${light.visible ? "on" : "off"}`);
    } else {
      console.error(`Light with name ${lightName} not found.`);
    }
  }

  setupLightControls() {
    const lights = [
      { name: "sun", label: "Toggle Sun" },
      { name: "ambient", label: "Toggle Ambient" },
      { name: "directional", label: "Toggle Directional" },
    ];

    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.top = "10px";
    container.style.right = "10px";
    container.style.background = "rgba(0, 0, 0, 0.6)";
    container.style.padding = "10px";
    container.style.borderRadius = "5px";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "5px";
    container.style.color = "white";
    container.style.zIndex = 100;

    document.body.appendChild(container);

    lights.forEach(({ name, label }) => {
      const button = document.createElement("button");
      const light = this.scene.getObjectByName(name);
      button.textContent = `${label}: ${light && light.visible ? 'ON' : 'OFF'}`;
      button.style.padding = "6px";
      button.style.fontSize = "12px";
      button.style.cursor = "pointer";

      button.addEventListener("click", () => {
        const light = this.scene.getObjectByName(name);
        if (light) {
          light.visible = !light.visible;
          button.textContent = `${label}: ${light.visible ? "ON" : "OFF"}`;
          console.log(`${name} light is now ${light.visible ? "ON" : "OFF"}`);
        } else {
          console.warn(`Light "${name}" not found in the scene.`);
        }
      });

      container.appendChild(button);
    });
  }
}

// Start the game
const game = new SpaceInvaders();
