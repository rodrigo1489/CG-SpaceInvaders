// main.js

import * as THREE from '/node_modules/three/build/three.module.js';
import { Player     } from './models/Player.js';
import { Enemy      } from './models/Enemy.js';
import { Boss       } from './models/Boss.js';
import { Barrier    } from './models/Barrier.js';
import { MotherShip } from './models/MotherShip.js';
import { GlassPlane } from './models/Vidro.js';
import { GAME_CONFIG } from './utils/constants.js';

class SpaceInvaders {
  constructor() {
    // Estado de transição/navegação
    this.levelTransitionActive = false;
    this.transitionStartTime   = 0;
    this.transitionDuration    = 0;
    this.transitionPhase       = 0;
    this.mothership            = null;
    this.circleCenter          = new THREE.Vector3();
    this.circleRadius          = 0;
    this.entryPoint            = new THREE.Vector3();

    this.shipSelectionActive   = false;
    this.availableShips        = [];
    this.selectedShipIndex     = null;
    this.chosenShip            = null;
    this.cameraLerp            = null;

    // Clonar elementos HTML que são frequentemente usados
    this.el = {
      hud:           document.getElementById('hud'),
      score:         document.getElementById('score'),
      lives:         document.getElementById('lives'),
      level:         document.getElementById('level'),
      highScore:     document.getElementById('high-score'),
      highestLevel:  document.getElementById('highest-level'),
      menu:          document.getElementById('menu'),
      shipSelection: document.getElementById('ship-selection'),
      confirmShip:   document.getElementById('confirm-ship'),
      startButton:   document.getElementById('start-button'),
      nextLevelBtn:  document.getElementById('next-level-button'),
      restartBtn:    document.getElementById('restart-button'),
      resumeBtn:     document.getElementById('resume-button'),
      mainMenuBtn:   document.getElementById('main-menu-button'),
      restartPause:  document.getElementById('restart-button-pause'),
      gameMode:      document.getElementById('game-mode'),
      pauseMenu:     document.getElementById('pause-menu'),
      levelComplete: document.getElementById('level-complete'),
      gameOver:      document.getElementById('game-over'),
      finalScore:    document.getElementById('final-score'),
      levelsCompleted: document.getElementById('levels-completed'),
      victoryScreen: document.getElementById('victory-screen'),
      levelScore:    document.getElementById('level-score'),
      currentLevel:  document.getElementById('current-level'),
      debugPanel:    document.getElementById('debug-panel'),
      debugInfo:     document.getElementById('debug-info'),
      debugModeChk:  document.getElementById('debug-mode'),
      debugInvincible: document.getElementById('debug-invincible'),
      debugClearEnemies: document.getElementById('debug-clear-enemies'),
      debugNextLevel: document.getElementById('debug-next-level')
    };

    this._cacheDOM();
    this._initThree();
    this._setupLighting();
    this._setupGameState();
    this._setupDebug();
    this._setupLightControls();
    this._setupEventListeners();
    this._autoStartIfNeeded();

    this.animate();
  }

  // Cacheia referências a elementos HTML para evitar múltiplos getElementById
  _cacheDOM() {
    // Se algum elemento não existir, assegura que se mantém null para não quebrar
    for (const key in this.el) {
      if (!this.el[key]) this.el[key] = null;
    }
  }

  // Inicialização da cena, câmara, renderer, chão e starfield
  _initThree() {
    this.scene    = new THREE.Scene();
    this.camera   = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({
      canvas:      document.getElementById('game-canvas'),
      antialias:   true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000);

    // Plano de chão para receber sombras
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.ShadowMaterial({ opacity: 0.4 })
    );
    ground.rotation.x   = -Math.PI / 2;
    ground.position.y   = -10;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Plano de vidro imediatamente abaixo do chão
    this.glassPlane = new GlassPlane(this.scene, 100, -10, -10.01);

    // Host starfield + nebulosas
    this._createStarfield();

    // Posição inicial da câmara
    this.camera.position.set(0, -12, 15);
    this.camera.lookAt(0, 5, 0);
  }

  // Cria partículas de estrela e sprites de nebulosa
  _createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < 1000; i++) {
      const x = (Math.random() - 0.5) * 200;
      const y = (Math.random() - 0.5) * 200;
      const z = (Math.random() - 0.5) * 100 - 50;
      vertices.push(x, y, z);
    }
    starsGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    this.starfield = new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({
        color:       0xffffff,
        size:        0.2,
        transparent: true
      })
    );
    this.scene.add(this.starfield);

    const nebulaTex = new THREE.TextureLoader().load(
      'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png'
    );
    const nebulaMat = new THREE.SpriteMaterial({
      map:               nebulaTex,
      color:             0x0066ff,
      transparent:       true,
      opacity:           0.1,
      blending:          THREE.AdditiveBlending
    });
    for (let i = 0; i < 20; i++) {
      const nebula = new THREE.Sprite(nebulaMat);
      nebula.position.set(
        (Math.random() - 0.5) * 100,
        (Math.random() - 0.5) * 100,
        -50
      );
      nebula.scale.set(20, 20, 1);
      this.scene.add(nebula);
    }
  }

  // Configura iluminação, lua e sol
  _setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    ambient.name = 'ambient';
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 5, 5);
    directional.castShadow = true;
    directional.shadow.camera.near = 0.5;
    directional.shadow.camera.far  = 100;
    directional.shadow.mapSize.set(2048, 2048);
    directional.name = 'directional';
    this.scene.add(directional);

    this._createMoon();
    this._createSun();
  }

  // Cria uma lua que orbita em torno do sol
  _createMoon() {
    const moonGeom = new THREE.SphereGeometry(1, 32, 32);
    const moonMat  = new THREE.MeshStandardMaterial({
      color:     0xaaaaaa,
      metalness: 0.1,
      roughness: 0.9
    });
    this.moon = new THREE.Mesh(moonGeom, moonMat);
    this.moon.castShadow    = true;
    this.moon.receiveShadow = true;

    this.moonOrbitRadius = 7;
    this.moonOrbitSpeed  = 0.5;
    this.moonOrbitAngle  = 0;
    this.scene.add(this.moon);
  }

  // Cria o sol com shaders para superfícies “borbulhantes”
  _createSun() {
    const loader = new THREE.TextureLoader();
    const baseTex  = loader.load('/src/textures/sun_surface.png');
    const noiseTex = loader.load('/src/textures/sun_noise.png');
    noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;

    const uniforms = {
      time:       { value: 0 },
      baseTex:    { value: baseTex },
      noiseTex:   { value: noiseTex },
      noiseScale: { value: 2.0 },
      emissive:   { value: new THREE.Color(0xffaa00) }
    };

    const vs = `
      varying vec2 vUv;
      uniform sampler2D noiseTex;
      uniform float noiseScale;
      uniform float time;
      void main() {
        vUv = uv;
        vec3 newPos = position + 
          normal * 0.55 * (texture2D(noiseTex, uv * noiseScale + time * 0.02).r - 0.5);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
      }
    `;
    const fs = `
      varying vec2 vUv;
      uniform sampler2D baseTex;
      uniform sampler2D noiseTex;
      uniform float time;
      uniform float noiseScale;
      uniform vec3 emissive;
      void main() {
        vec3 baseCol = texture2D(baseTex, vUv * 4.0).rgb;
        float n  = texture2D(noiseTex, vUv * noiseScale * 1.8 + vec2(time*0.12, time*0.08)).r;
        float n2 = texture2D(noiseTex, vUv * noiseScale * 2.6 - vec2(time*0.07, time*0.11)).r;
        float flame = smoothstep(0.3, 1.0, n + n2 * 0.5);
        vec3 color = mix(baseCol, emissive * 1.6, flame);
        gl_FragColor = vec4(color, 1.0);
      }
    `;
    const sunMat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader:   vs,
      fragmentShader: fs
    });

    const sun = new THREE.Mesh(new THREE.SphereGeometry(2, 64, 64), sunMat);
    sun.position.set(-10, 20, 10);
    sun.castShadow    = true;
    sun.receiveShadow = true;
    sun.name = 'sun';
    this.scene.add(sun);

    const sunlight = new THREE.DirectionalLight(0xffddaa, 2);
    sunlight.position.copy(sun.position);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(2048, 2048);
    sunlight.shadow.camera.near = 0.5;
    sunlight.shadow.camera.far  = 100;
    sunlight.name = 'sunlight';
    this.scene.add(sunlight);

    this._sunUniforms = uniforms;
  }

  // Incrementa o tempo do shader do sol em cada frame
  _updateSun(delta) {
    if (this._sunUniforms) this._sunUniforms.time.value += delta;
  }

  // Inicializa variáveis de estado do jogo e HUD
  _setupGameState() {
    this.gameStarted   = false;
    this.player        = new Player(this.scene);
    this.enemies       = [];
    this.barriers      = [];
    this.playerBullets = [];
    this.enemyBullets  = [];
    this.score         = 0;
    this.lives         = 3;
    this.level         = 1;
    this.highScore     = parseInt(localStorage.getItem('highScore'))   || 0;
    this.highestLevel  = parseInt(localStorage.getItem('highestLevel'))|| 1;

    this.el.highScore.textContent   = `HIGH SCORE: ${this.highScore}`;
    this.el.highestLevel.textContent = `HIGHEST LEVEL: ${this.highestLevel}`;
    this._updateHUD();
  }

  // Configuração inicial do modo debug (painel escondido)
  _setupDebug() {
    this.debugMode     = false;
    this.debugObjects  = [];
    this.lastFpsUpdate = performance.now();
    this.frames        = 0;
    this.fps           = 0;
  }

  // Alterna modo debug (mostra hitboxes + informações)
  toggleDebugMode(enable) {
    this.debugMode = enable;
    if (this.el.debugPanel) {
      this.el.debugPanel.style.display = enable ? 'block' : 'none';
    }
    this._clearDebugVisuals();
    if (enable) this._createDebugVisuals();
  }

  // Remove todos os objetos de debug da cena
  _clearDebugVisuals() {
    this.debugObjects.forEach(o => this.scene.remove(o));
    this.debugObjects = [];
  }

  // Cria hitboxes para player, inimigos, barreiras e um helper de eixos
  _createDebugVisuals() {
    if (this.player) this._createHitbox(this.player, 1.5, 0x00ff00);
    this.enemies.forEach(e => this._createHitbox(e, 1.5, 0xff0000));
    this.barriers.forEach(b => this._createBarrierHitboxes(b));

    const axes = new THREE.AxesHelper(10);
    this.scene.add(axes);
    this.debugObjects.push(axes);
  }

  // Hitbox genérica (esfera) para uma entidade
  _createHitbox(entity, radius = 1.5, color = 0xff0000) {
    if (!entity || !entity.model) return;
    const pos     = entity.getPosition();
    const geo     = new THREE.SphereGeometry(entity.hitboxRadius || radius, 16, 16);
    const mat     = new THREE.MeshBasicMaterial({
      color, wireframe: true, transparent: true, opacity: 0.5
    });
    const sphere  = new THREE.Mesh(geo, mat);
    sphere.position.copy(pos);
    sphere.userData.entityRef = entity;
    this.scene.add(sphere);
    this.debugObjects.push(sphere);
  }

  // Hitbox específica (caixa + pilares) para barreiras
  _createBarrierHitboxes(barrier) {
    if (!barrier || !barrier.model) return;
    const posMain = barrier.getPosition();
    const geomMain  = new THREE.BoxGeometry(3.5, 2.5, 0.8);
    const matMain   = new THREE.MeshBasicMaterial({
      color: 0xff9900, wireframe: true, transparent: true, opacity: 0.5
    });
    const mainBox   = new THREE.Mesh(geomMain, matMain);
    mainBox.position.copy(posMain);
    mainBox.userData.entityRef = barrier;
    this.scene.add(mainBox);
    this.debugObjects.push(mainBox);

    if (barrier.leftPillarPos) {
      const pillarGeom = new THREE.CylinderGeometry(0.6, 0.6, 3, 8);
      const pillarMat  = new THREE.MeshBasicMaterial({
        color: 0xffcc00, wireframe: true, transparent: true, opacity: 0.5
      });
      const leftP  = new THREE.Mesh(pillarGeom, pillarMat);
      leftP.position.copy(barrier.leftPillarPos);
      leftP.userData.entityRef = barrier;
      this.scene.add(leftP);
      this.debugObjects.push(leftP);

      const rightP = new THREE.Mesh(pillarGeom, pillarMat);
      rightP.position.copy(barrier.rightPillarPos);
      rightP.userData.entityRef = barrier;
      this.scene.add(rightP);
      this.debugObjects.push(rightP);

      const topGeom = new THREE.BoxGeometry(3, 0.8, 0.8);
      const topMat  = new THREE.MeshBasicMaterial({
        color: 0xffcc00, wireframe: true, transparent: true, opacity: 0.5
      });
      const topSect = new THREE.Mesh(topGeom, topMat);
      topSect.position.copy(barrier.topPos);
      topSect.userData.entityRef = barrier;
      this.scene.add(topSect);
      this.debugObjects.push(topSect);
    }
  }

  // Atualiza posições de hitboxes e painel de debug (FPS, estatísticas)
  _updateDebugInfo() {
    if (!this.debugMode) return;

    // Atualiza cada hitbox
    this.debugObjects.forEach(o => {
      if (o.userData.entityRef && o.userData.entityRef.getPosition) {
        o.position.copy(o.userData.entityRef.getPosition());
      }
    });

    // Calcula FPS em janela de 1 segundo
    const now = performance.now();
    this.frames++;
    if (now - this.lastFpsUpdate > 1000) {
      this.fps = Math.round((this.frames * 1000) / (now - this.lastFpsUpdate));
      this.lastFpsUpdate = now;
      this.frames = 0;
    }

    // Obtém info do player (invulnerável, shots fired, times hit, distance moved)
    const pInfo = this.player.getDebugInfo();
    let txt = `FPS: ${this.fps}\n`;
    txt += `Game State: ${this.gameStarted ? 'RUNNING' : 'PAUSED'}\n`;
    txt += `Slow Motion: ${this.slowMotion ? 'ON' : 'OFF'}\n`;
    txt += '----------\n';
    txt += `Level: ${this.level}\n`;
    txt += `Score: ${this.score}\n`;
    txt += `Lives: ${this.lives}\n`;
    txt += '----------\n';
    txt += `Enemies: ${this.enemies.length}\n`;
    txt += `Player Bullets: ${this.playerBullets.length}\n`;
    txt += `Enemy Bullets: ${this.enemyBullets.length}\n`;
    txt += '----------\n';
    txt += `Player Position: ${this._formatVec(this.player.getPosition())}\n`;
    txt += `Player Invulnerable: ${pInfo.isInvulnerable ? 'YES' : 'NO'}\n`;
    txt += `Shots Fired: ${pInfo.shotsFired}\n`;
    txt += `Times Hit: ${pInfo.timesHit}\n`;
    txt += `Distance Moved: ${pInfo.distanceMoved}u\n`;
    txt += '----------\n';
    txt += `Camera: ${this._formatVec(this.camera.position)}\n`;
    txt += '\nKeyboard Shortcuts:\n';
    txt += '` - Toggle debug mode\n';
    txt += 'i - Toggle invincibility\n';
    txt += 'c - Clear enemies\n';
    txt += 'n - Next level\n';
    txt += 'p - Pause/resume\n';
    txt += 's - Slow motion\n';

    if (this.el.debugInfo) this.el.debugInfo.textContent = txt;
  }

  // Formata vetores em texto com 2 casas decimais
  _formatVec(v) {
    return `x:${v.x.toFixed(2)}, y:${v.y.toFixed(2)}, z:${v.z.toFixed(2)}`;
  }

  // Seta controles que permitem ativar/desativar luzes no canto superior
  _setupLightControls() {
    const lights = [
      { name: 'sunlight',    label: 'Toggle Sun' },
      { name: 'ambient',     label: 'Toggle Ambient' },
      { name: 'directional', label: 'Toggle Directional' }
    ];
    const container = document.createElement('div');
    Object.assign(container.style, {
      position:     'absolute',
      top:          '10px',
      right:        '10px',
      background:   'rgba(0,0,0,0.6)',
      padding:      '10px',
      borderRadius: '5px',
      display:      'flex',
      flexDirection:'column',
      gap:          '5px',
      color:        'white',
      zIndex:       '100'
    });
    document.body.appendChild(container);

    lights.forEach(({ name, label }) => {
      const btn   = document.createElement('button');
      const light = this.scene.getObjectByName(name);
      btn.textContent = `${label}: ${light && light.visible ? 'ON' : 'OFF'}`;
      btn.style.padding   = '6px';
      btn.style.fontSize  = '12px';
      btn.style.cursor    = 'pointer';
      btn.addEventListener('click', () => {
        const l = this.scene.getObjectByName(name);
        if (l) {
          l.visible = !l.visible;
          btn.textContent = `${label}: ${l.visible ? 'ON' : 'OFF'}`;
        }
      });
      container.appendChild(btn);
    });
  }

  // Regista todos os eventos de teclado, botões e resize
  _setupEventListeners() {
    this.keys = {};
    window.addEventListener('keydown', e => {
      this.keys[e.key] = true;

      if (e.key === 'Escape') {
        if (this.gameStarted) this.togglePauseMenu(true);
        else if (this.el.pauseMenu && this.el.pauseMenu.style.display === 'flex') {
          this.togglePauseMenu(false);
        }
      }

      // Debug shortcuts (apenas se debugMode = true)
      if (this.debugMode) {
        if (e.key === 'i') {
          this.player.isInvulnerable = !this.player.isInvulnerable;
          console.log(`Player invincibility: ${this.player.isInvulnerable ? 'ON' : 'OFF'}`);
        }
        if (e.key === 'c') {
          this.enemies.forEach(en => en.remove());
          this.enemies = [];
          console.log('Inimigos limpos');
        }
        if (e.key === 'n') {
          this.level++;
          this._updateHUD();
          this._createLevel();
          this._clearDebugVisuals();
          this._createDebugVisuals();
          console.log(`Próximo nível: ${this.level}`);
        }
        if (e.key === 'p') {
          this.gameStarted = !this.gameStarted;
          console.log(`Game ${this.gameStarted ? 'resumed' : 'paused'}`);
        }
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

      // Alterna debug mode com `
      if (e.key === '`' && this.el.debugModeChk) {
        this.el.debugModeChk.checked = !this.el.debugModeChk.checked;
        this.toggleDebugMode(this.el.debugModeChk.checked);
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.key] = false; });
    window.addEventListener('resize', () => this._handleResize());

    // Botões do menu
    if (this.el.startButton) {
      this.el.startButton.addEventListener('click', () => {
        this.el.menu.style.display = 'none';
        const credits = document.querySelector('.credits');
        if (credits) credits.classList.add('hidden');
        this._startShipSelection();
      });
    }
    if (this.el.confirmShip) {
      this.el.confirmShip.addEventListener('click', () => {
        this.el.shipSelection.style.display = 'none';
        this._finaliseSelection();
      });
    }
    if (this.el.nextLevelBtn) {
      this.el.nextLevelBtn.addEventListener('click', () => {
        this.el.levelComplete.style.display = 'none';
        this.level++;
        this._updateHUD();
        this._createLevel();
        this.gameStarted = true;
      });
    }
    if (this.el.restartBtn) {
      this.el.restartBtn.addEventListener('click', () => this._resetToLevel1());
    }
    if (this.el.resumeBtn) {
      this.el.resumeBtn.addEventListener('click', () => this.togglePauseMenu(false));
    }
    if (this.el.mainMenuBtn) {
      this.el.mainMenuBtn.addEventListener('click', () => location.reload());
    }
    if (this.el.restartPause) {
      this.el.restartPause.addEventListener('click', () => this._resetToLevel1());
    }

    // Troca modo de câmara (action-cam vs 2D)
    if (this.el.gameMode) {
      this.el.gameMode.addEventListener('change', e => {
        const pos = this.player.getPosition();
        if (e.target.value === 'action-cam') {
          this.camera.position.set(pos.x * 0.8, -12, 15);
          this.camera.lookAt(pos.x * 0.8, 5, 0);
        } else {
          this.camera.position.set(pos.x * 0.8, 0, 30);
          this.camera.lookAt(pos.x * 0.8, 0, 0);
        }
      });
    }

    // Botões debug (invincible, clear enemies, next level)
    if (this.el.debugInvincible) {
      this.el.debugInvincible.addEventListener('click', () => {
        if (this.player) {
          this.player.isInvulnerable = !this.player.isInvulnerable;
          alert(`Player invincibility: ${this.player.isInvulnerable ? 'ON' : 'OFF'}`);
        }
      });
    }
    if (this.el.debugClearEnemies) {
      this.el.debugClearEnemies.addEventListener('click', () => {
        this.enemies.forEach(en => en.remove());
        this.enemies = [];
      });
    }
    if (this.el.debugNextLevel) {
      this.el.debugNextLevel.addEventListener('click', () => {
        this.level++;
        this._updateHUD();
        this._createLevel();
        if (this.debugMode) {
          this._clearDebugVisuals();
          this._createDebugVisuals();
        }
      });
    }
  }

  // Se sessionStorage.autoStart = "1", salta seleção de nave
  _autoStartIfNeeded() {
    if (sessionStorage.getItem('autoStart') === '1') {
      sessionStorage.removeItem('autoStart');
      this.selectedShipIndex = 0;
      this._finaliseSelection();
    }
  }

  // Redimensiona câmara/renderer
  _handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // Inicia menu de seleção de nave (cria 4 instâncias Player giratórias)
  _startShipSelection() {
    this.shipSelectionActive = true;
    if (this.el.shipSelection) this.el.shipSelection.style.display = 'flex';
    const shipCount = 4;
    const spacing   = 8;
    const yPos      = 0;

    this.availableShips = [];
    for (let i = 0; i < shipCount; i++) {
      const p = new Player(this.scene, i);
      p.model.position.set((i - (shipCount - 1)/2) * spacing, yPos, 0);
      p.model.userData.selfSpin = true;
      this.availableShips.push(p.model);
    }

    this.raycaster = new THREE.Raycaster();
    this.mouse     = new THREE.Vector2();
    window.addEventListener('click', e => this._handleShipClick(e));

    if (this.el.hud) this.el.hud.style.display = 'none';
  }

  // Detecta clique e escolhe nave com raycaster
  _handleShipClick(event) {
    if (!this.shipSelectionActive) return;
    this.mouse.x = (event.clientX / window.innerWidth)  * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.availableShips, true);
    if (hits.length) this._chooseShip(hits[0].object);
  }

  // Marca nave escolhida e aproxima câmara, exibe botão “Confirmar”
  _chooseShip(mesh) {
    const ship = this.availableShips.find(s => mesh === s || mesh.parent === s);
    if (!ship) return;
    this.selectedShipIndex = this.availableShips.indexOf(ship);
    this.chosenShip = ship;
    this.availableShips.forEach(s => s.userData.selfSpin = false);
    ship.userData.selfSpin = true;

    const target = new THREE.Vector3(ship.position.x, ship.position.y + 2, ship.position.z + 6);
    this.cameraLerp = {
      start: this.camera.position.clone(),
      end:   target,
      t:     0
    };

    if (this.el.confirmShip) this.el.confirmShip.style.display = 'block';
  }

  // Finaliza seleção: remove seleções, cria Player definitivo, reposiciona câmara e inicia nível 1
  _finaliseSelection() {
    if (this.player && this.player.model) {
      this.scene.remove(this.player.model);
    }
    this.player = new Player(this.scene, this.selectedShipIndex);

    this.availableShips.forEach(s => this.scene.remove(s));
    this.availableShips = [];
    this.chosenShip = null;
    this.shipSelectionActive = false;

    const mode = this.el.gameMode ? this.el.gameMode.value : 'action-cam';
    if (mode === 'action-cam') {
      this.camera.position.set(0, -12, 15);
      this.camera.lookAt(0, 5, 0);
    } else {
      this.camera.position.set(0, 0, 30);
      this.camera.lookAt(0, 0, 0);
    }

    this.level = 1;
    this._createLevel();
    this.gameStarted = true;
    if (this.el.hud) this.el.hud.style.display = 'block';
  }

  // Cria nível (verifica se é boss ou standard + cria barreiras)
  _createLevel() {
    // Limpa inimigos, barreiras, balas antigas
    this.enemies.forEach(e => e.remove());
    this.barriers.forEach(b => b.remove());
    this.playerBullets.forEach(b => this.scene.remove(b));
    this.enemyBullets.forEach(b => this.scene.remove(b));
    this.enemies       = [];
    this.barriers      = [];
    this.playerBullets = [];
    this.enemyBullets  = [];

    if (this.level > 20) {
      this._showVictoryScreen();
      return;
    }

    if (this.level % 5 === 0) this._createBossLevel();
    else this._createStandardLevel();

    const spacing = 12;
    const offset  = -(GAME_CONFIG.BARRIER_COUNT * spacing) / 2 + spacing / 2;
    for (let i = 0; i < GAME_CONFIG.BARRIER_COUNT; i++) {
      const pos = new THREE.Vector3(offset + i * spacing, -2, 0);
      this.barriers.push(new Barrier(this.scene, pos));
    }
  }

  // Níveis “normais”: grelha de inimigos com dificuldade crescente
  _createStandardLevel() {
    const rows = Math.min(4 + Math.floor(this.level / 3), 6);
    const cols = Math.min(5 + Math.floor(this.level / 4), 8);
    const xSpacing = 5;
    const ySpacing = 4.5;
    const xOffset  = -(cols * xSpacing) / 2 + xSpacing / 2;
    const startY   = 15;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const enemy = new Enemy(this.scene, r, c);
        enemy.model.position.set(
          xOffset + c * xSpacing,
          startY - r * ySpacing,
          0
        );
        const prog = Math.min(this.level / 10, 1);
        enemy.amplitude        = 0.02 + prog * 0.03;
        enemy.frequency        = 1 + prog * 1.5;
        enemy.shootingInterval = 5000 - prog * 3000;
        this.enemies.push(enemy);
      }
    }
  }

  // Níveis “boss”: cria chefe e minions se for boss ≥ 2
  _createBossLevel() {
    const bossLevel = this.level / 5;
    const boss = new Boss(this.scene, bossLevel);
    this.enemies.push(boss);

    if (bossLevel >= 2) {
      const minionCount   = bossLevel * 2;
      const spacing       = 6;
      const offset        = -(minionCount * spacing) / 2 + spacing / 2;
      for (let i = 0; i < minionCount; i++) {
        const minion = new Enemy(this.scene, 1, i);
        minion.model.position.set(offset + i * spacing, 10, 0);
        minion.amplitude = 0.03;
        minion.frequency = 1.5;
        this.enemies.push(minion);
      }
    }
  }

  // Overlay “Nível Completo” com cut‐scene de transição
  _showLevelComplete() {
    this.levelTransitionActive = true;
    this.gameStarted           = false;
    if (this.el.hud) this.el.hud.style.display = 'none';

    this.barriers.forEach(b => b.remove());
    this.barriers       = [];
    this.playerBullets.forEach(b => this.scene.remove(b));
    this.enemyBullets.forEach(b => this.scene.remove(b));
    this.playerBullets  = [];
    this.enemyBullets   = [];

    this.transitionStartTime = performance.now();
    this.transitionDuration  = 5000; // 3s círculo + 2s entrada
    this.transitionPhase     = 0;

    const geo = new THREE.CylinderGeometry(6, 6, 2, 32);
    const mat = new THREE.MeshPhongMaterial({ color: 0x6666ff, emissive: 0x222266 });
    this.mothership = new THREE.Mesh(geo, mat);
    this.mothership.position.set(0, 12, 0);
    this.scene.add(this.mothership);

    this.circleRadius = 10;
    this.circleCenter.set(0, 2, 0);
    this.entryPoint.set(0, 11, 0);
  }

  // Remove mothership e posiciona jogador para exibir “Nível Completo” HTML
  _endLevelTransition() {
    this.scene.remove(this.mothership);
    this.mothership.geometry.dispose();
    this.mothership.material.dispose();
    this.mothership = null;

    this.player.model.position.set(0, -8, 0);
    this.player.model.rotation.set(Math.PI * 1.2, Math.PI * 0.5, Math.PI);

    if (this.el.hud) this.el.hud.style.display = 'block';
    this.levelTransitionActive = false;
    this._showLevelOverlay();
  }

  // Exibe overlay “Nível Completo” e atualiza highest level
  _showLevelOverlay() {
    if (this.el.levelScore)   this.el.levelScore.textContent   = `SCORE: ${this.score}`;
    if (this.el.currentLevel) this.el.currentLevel.textContent = `LEVEL: ${this.level}`;
    if (this.el.levelComplete) this.el.levelComplete.style.display = 'flex';

    if (this.level > this.highestLevel) {
      this.highestLevel = this.level;
      localStorage.setItem('highestLevel', this.highestLevel);
      if (this.el.highestLevel) this.el.highestLevel.textContent = `HIGHEST LEVEL: ${this.highestLevel}`;
    }
  }

  // Overlay “Game Over”
  _showGameOver() {
    this.gameStarted = false;
    if (this.el.finalScore)     this.el.finalScore.textContent     = `FINAL SCORE: ${this.score}`;
    if (this.el.levelsCompleted) this.el.levelsCompleted.textContent = `LEVELS COMPLETED: ${this.level - 1}`;
    if (this.el.gameOver)       this.el.gameOver.style.display     = 'flex';

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('highScore', this.highScore);
      if (this.el.highScore) this.el.highScore.textContent = `HIGH SCORE: ${this.highScore}`;
    }
  }

  // Exibe overlay “Vitória” (quando level > 20)
  _showVictoryScreen() {
    this.gameStarted = false;

    if (!this.el.victoryScreen) {
      const victory = document.createElement('div');
      victory.id        = 'victory-screen';
      victory.className = 'overlay';
      victory.style.display = 'flex';
      victory.innerHTML = `
        <h1>CONGRATULATIONS!</h1>
        <div class="menu-content">
          <div>You have completed all 20 levels!</div>
          <div id="final-victory-score">FINAL SCORE: ${this.score}</div>
          <button id="play-again-button">PLAY AGAIN</button>
        </div>
      `;
      const container = document.getElementById('game-container') || document.body;
      container.appendChild(victory);
      victory.querySelector('#play-again-button').addEventListener('click', () => {
        victory.style.display = 'none';
        location.reload();
      });
      this.el.victoryScreen = victory;
    } else {
      const finalScoreEl = document.getElementById('final-victory-score');
      if (finalScoreEl) finalScoreEl.textContent = `FINAL SCORE: ${this.score}`;
      this.el.victoryScreen.style.display = 'flex';
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('highScore', this.highScore);
      if (this.el.highScore) this.el.highScore.textContent = `HIGH SCORE: ${this.highScore}`;
    }
  }

  // Reinicia jogo para o nível 1 sem recarregar a página
  _resetToLevel1() {
    this.enemies.forEach(e => e.remove());
    this.barriers.forEach(b => b.remove());
    this.playerBullets.forEach(b => this.scene.remove(b));
    this.enemyBullets.forEach(b => this.scene.remove(b));

    this.enemies       = [];
    this.barriers      = [];
    this.playerBullets = [];
    this.enemyBullets  = [];

    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this._updateHUD();
    this._createLevel();

    if (this.el.gameOver)       this.el.gameOver.style.display       = 'none';
    if (this.el.pauseMenu)      this.el.pauseMenu.style.display      = 'none';
    if (this.el.levelComplete)  this.el.levelComplete.style.display  = 'none';
    if (this.el.victoryScreen)  this.el.victoryScreen.style.display  = 'none';

    this.gameStarted = true;
  }

  // Atualiza pontuação, vidas e nível no HUD
  _updateHUD() {
    if (this.el.score) this.el.score.textContent = `SCORE: ${this.score}`;
    if (this.el.lives) this.el.lives.textContent = `LIVES: ${this.lives}`;
    if (this.el.level) this.el.level.textContent = `LEVEL: ${this.level}`;
  }

  // Loop principal de animação
  animate() {
    requestAnimationFrame(() => this.animate());

    const now = performance.now();
    const delta = (this._lastFrameTime ? (now - this._lastFrameTime) : 0) / 1000;
    this._lastFrameTime = now;

    this._update(delta);
    this.renderer.render(this.scene, this.camera);
  }

  // Lógica de atualização a cada frame
  _update(delta) {
    if (!this.gameStarted && !this.levelTransitionActive && !this.shipSelectionActive) return;

    // Atualiza tempo do shader do sol
    this._updateSun(delta);

    // Animação da lua em órbita
    if (this.moon && this.scene.getObjectByName('sun')) {
      const sunPos = this.scene.getObjectByName('sun').position;
      this.moonOrbitAngle += this.moonOrbitSpeed * 0.01;
      this.moon.position.set(
        sunPos.x + this.moonOrbitRadius * Math.cos(this.moonOrbitAngle),
        sunPos.y,
        sunPos.z + this.moonOrbitRadius * Math.sin(this.moonOrbitAngle)
      );
    }

    // Se menu de seleção de nave ativo → apenas gira naves e anima câmara
    if (this.shipSelectionActive) {
      this.availableShips.forEach(s => {
        if (s.userData.selfSpin) s.rotation.y += 0.05;
      });
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
        this.camera.lookAt(this.chosenShip ? this.chosenShip.position : new THREE.Vector3(0, 0, 0));
      }
      return;
    }

    // Se cut‐scene de transição de nível ativo → executa animação do círculo e entrada
    if (this.levelTransitionActive) {
      const elapsed = (performance.now() - this.transitionStartTime) / this.transitionDuration;
      if (this.transitionPhase === 0) {
        const k = Math.min(elapsed / 0.6, 1);
        const angle = k * Math.PI * 2;
        this.player.model.position.set(
          this.circleCenter.x + this.circleRadius * Math.cos(angle),
          this.circleCenter.y + 2 * Math.sin(angle),
          0
        );
        this.player.model.rotation.y += 0.25;
        if (k >= 1) {
          this.transitionPhase   = 1;
          this.phase1StartTime   = performance.now();
        }
      } else {
        const k = Math.min((performance.now() - this.phase1StartTime) / 2000, 1);
        const pos = this.player.model.position.clone();
        this.player.model.position.lerpVectors(pos, this.entryPoint, k);
        this.player.model.rotation.y += 0.15;
        this.mothership.material.emissiveIntensity = 0.5 + 0.5 * Math.sin(k * Math.PI * 4);
        if (k >= 1) this._endLevelTransition();
      }
      return;
    }

    // Rotaciona lentamente o starfield
    if (this.starfield) this.starfield.rotation.z += 0.0001;

    // Movimento do jogador via teclado
    if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) this.player.move('left');
    if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) this.player.move('right');
    if (this.keys[' '] || this.keys['Enter']) {
      const bullet = this.player.shoot();
      if (bullet) this.playerBullets.push(bullet);
    }

    // Atualiza câmara para seguir jogador (action-cam vs 2D)
    const playerPos = this.player.getPosition();
    if (this.el.gameMode && this.el.gameMode.value === 'action-cam') {
      this.camera.position.x = playerPos.x * 0.8;
      this.camera.lookAt(playerPos.x * 0.8, 5, 0);
    } else {
      this.camera.position.x = playerPos.x * 0.8;
      this.camera.lookAt(playerPos.x * 0.8, 0, 0);
    }

    // Inimigos disparam aleatoriamente
    if (Math.random() < 0.02 && this.enemies.length > 0) {
      const rndIdx = Math.floor(Math.random() * this.enemies.length);
      const bullets = this.enemies[rndIdx].shoot();
      if (bullets) {
        if (Array.isArray(bullets)) bullets.forEach(b => this.enemyBullets.push(b));
        else this.enemyBullets.push(bullets);
      }
    }

    // Atualiza todas as balas
    this._updateBullets();

    // Move inimigos e checa condições de game over
    let enemyInDanger = false;
    const time = Date.now() * 0.001;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.move(time);
      if (e.isBoss) continue;
      if (e.model.position.y < 0) enemyInDanger = true;
      if (e.model.position.y < -5) {
        this._showGameOver();
        return;
      }
    }
    if (enemyInDanger) {
      this._showGameOver();
      return;
    }

    // Se não houver inimigos, nível completo
    if (this.enemies.length === 0) {
      this._showLevelComplete();
    }

    // Atualiza painéis de debug
    this._updateDebugInfo();
  }

  // Movimenta balas do jogador e inimigos, checando colisões
  _updateBullets() {
    // Balas do jogador (subindo)
    for (let i = this.playerBullets.length - 1; i >= 0; i--) {
      const b = this.playerBullets[i];
      if (this.debugMode && !b.userData.trail) this._createBulletTrail(b, 0xffff00);
      b.position.y += GAME_CONFIG.BULLET_SPEED;
      b.position.z = 0;

      if (this.debugMode && b.userData.trail) this._updateBulletTrail(b);

      // Colisões com inimigos
      let hitEnemy = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const dist = b.position.distanceTo(e.getPosition());
        if (dist < e.hitboxRadius) {
          this.scene.remove(b);
          this.playerBullets.splice(i, 1);
          const destroyed = e.takeDamage(1);
          if (destroyed) {
            e.remove();
            this.enemies.splice(j, 1);
            this.score += e.pointValue || 100;
            this._updateHUD();
          } else if (e.isBoss) {
            this.score += 10;
            this._updateHUD();
          }
          hitEnemy = true;
          break;
        }
      }
      if (hitEnemy) continue;

      // Colisões com barreiras
      let hitBarrier = false;
      for (const barrier of this.barriers) {
        const col = barrier.checkBulletCollision(b);
        if (col.hit) {
          this.scene.remove(b);
          this.playerBullets.splice(i, 1);
          hitBarrier = true;
          break;
        }
      }
      if (hitBarrier) continue;

      // Balas fora da tela
      if (b.position.y > 20) {
        this.scene.remove(b);
        this.playerBullets.splice(i, 1);
      }
    }

    // Balas dos inimigos (descendo)
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const b = this.enemyBullets[i];
      if (this.debugMode && !b.userData.trail) this._createBulletTrail(b, 0xff0000);

      // Se bala especial (laser ou padrão circular)
      if (b.userData && b.userData.isSpecialAttack) {
        this._updateSpecialBullet(b, i);
        continue;
      }

      b.position.y -= GAME_CONFIG.BULLET_SPEED;
      b.position.z = 0;
      if (this.debugMode && b.userData.trail) this._updateBulletTrail(b);

      // Colisão com jogador
      const pdist = b.position.distanceTo(this.player.getPosition());
      if (pdist < this.player.hitboxRadius) {
        this.scene.remove(b);
        this.enemyBullets.splice(i, 1);
        if (this.player.hit()) {
          const dmg = (b.userData.isBossBullet ? (b.userData.bossLevel || 1) : 1);
          this.lives -= dmg;
          this._updateHUD();
          if (this.lives <= 0) {
            this._showGameOver();
            return;
          }
        }
        continue;
      }

      // Colisão com barreiras
      let hitBarrier = false;
      for (const barrier of this.barriers) {
        const col = barrier.checkBulletCollision(b);
        if (col.hit) {
          this.scene.remove(b);
          this.enemyBullets.splice(i, 1);
          hitBarrier = true;
          break;
        }
      }
      if (hitBarrier) continue;

      // Balas fora da tela
      if (b.position.y < -10) {
        this.scene.remove(b);
        this.enemyBullets.splice(i, 1);
      }
    }
  }

  // Atualiza bala especial (laser ou padrão circular)
  _updateSpecialBullet(b, index) {
    // Laser: avalia duração e colisão vertical
    if (b.userData.duration) {
      b.userData.duration--;
      const pPos = this.player.getPosition();
      if (Math.abs(pPos.x - b.position.x) < 1 && pPos.y < b.position.y + 10 && pPos.y > b.position.y - 10) {
        if (this.player.hit()) {
          this.lives -= b.userData.damage || 1;
          this._updateHUD();
          if (this.lives <= 0) {
            this._showGameOver();
            return;
          }
        }
      }
      if (b.userData.duration <= 0) {
        this.scene.remove(b);
        this.enemyBullets.splice(index, 1);
      }
      return;
    }

    // Padrão circular ou espiral
    if (b.userData.angle !== undefined) {
      const angle  = b.userData.angle;
      const speed  = b.userData.speed || 0.2;
      const radius = b.userData.radius || 3;
      b.userData.angle += speed * 0.05;

      const originX = b.userData.originX !== undefined ? b.userData.originX : (b.position.x - Math.cos(angle) * radius);
      b.position.y -= speed;
      b.position.x = originX + Math.cos(b.userData.angle) * radius;
      b.userData.originX = originX;

      if (this.debugMode && b.userData.trail) this._updateBulletTrail(b);

      // Colisão com jogador
      const pdist = b.position.distanceTo(this.player.getPosition());
      if (pdist < this.player.hitboxRadius) {
        this.scene.remove(b);
        this.enemyBullets.splice(index, 1);
        if (this.player.hit()) {
          this.lives--;
          this._updateHUD();
          if (this.lives <= 0) {
            this._showGameOver();
            return;
          }
        }
        return;
      }

      // Colisão com barreiras
      for (const barrier of this.barriers) {
        const col = barrier.checkBulletCollision(b);
        if (col.hit) {
          this.scene.remove(b);
          this.enemyBullets.splice(index, 1);
          return;
        }
      }

      if (b.position.y < -10) {
        this.scene.remove(b);
        this.enemyBullets.splice(index, 1);
      }
    }
  }

  // Cria “rastro” (linha) para bala em modo debug
  _createBulletTrail(b, color) {
    const mat = new THREE.LineBasicMaterial({ color });
    const pts = [b.position.clone(), b.position.clone()];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    b.userData.trail       = line;
    b.userData.trailPoints = pts;
    b.userData.maxTrailLength = 20;
    this.debugObjects.push(line);
  }

  // Atualiza pontos da linha (trail) de bala
  _updateBulletTrail(b) {
    if (!b.userData.trail || !b.userData.trailPoints) return;
    b.userData.trailPoints.push(b.position.clone());
    if (b.userData.trailPoints.length > b.userData.maxTrailLength) {
      b.userData.trailPoints.shift();
    }
    const geo = new THREE.BufferGeometry().setFromPoints(b.userData.trailPoints);
    b.userData.trail.geometry.dispose();
    b.userData.trail.geometry = geo;
  }

  // Mostra/oculta menu de pausa
  togglePauseMenu(show) {
    if (this.el.pauseMenu) this.el.pauseMenu.style.display = show ? 'flex' : 'none';
    this.gameStarted = !show;
  }
}

// Instancia o jogo
const game = new SpaceInvaders();
