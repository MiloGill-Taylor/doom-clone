import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { generateLevel, buildLevel, addWallQuotes, spawnEnemies } from './levelGenerator.js';
import { createWeapon, createLighting, setupControls, loadAssets } from './gameSetup.js';

// Game state
const gameState = {
    health: 100,
    ammo: 50,
    isPointerLocked: false,
    playerIsDead: false,
    keys: {},
    mouseMovement: { x: 0, y: 0 },
    currentLevel: 1,
    levelCompleted: false,
    showingLevelText: false,
    godMode: false // God mode for testing
};

// Three.js setup
let scene, camera, renderer;
let player, weapon, walls = [];
const bullets = [];
const enemies = [];
const enemyProjectiles = [];
let clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();
const fbxLoader = new FBXLoader();
let wallTexture, brickTexture;
let floorTexture, grateTexture;
let enemyTextures = {}; // Store enemy logo textures
let bottleModel = null;
let flowerModel = null;
let flowerTexture = null;
let workstationModel = null;

// Movement variables
const moveSpeed = 12;
const mouseSensitivity = 0.002;
const cameraHeight = 1.7;

// Weapon variables
const bulletSpeed = 50;

// Enemy variables
const enemyMoveSpeed = 2.5;
const enemyFireRate = 1; // seconds
const enemyProjectileSpeed = 20;

// Enemy type definitions
const enemyTypes = {
    1: { color: 0xff0000, health: 75, speed: 2.5, fireRate: 1.0 },   // Red - Basic
    2: { color: 0x00ff00, health: 100, speed: 3.0, fireRate: 0.8 },  // Green - Fast
    3: { color: 0x0000ff, health: 150, speed: 2.0, fireRate: 0.6 }   // Blue - Tank
};

// Level generation variables
let levelData = {
    rooms: [],
    corridors: [],
    sideRooms: [],
    doors: [],
    startPos: { x: 0, z: 0 },
    endPos: { x: 0, z: 0 },
    currentLevel: 1
};


// Initialize the game
function init() {
    // Create scene first
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 1, 50);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    // Create renderer
    const canvas = document.getElementById('gameCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x001122);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Create player object (for position and yaw)
    player = new THREE.Object3D();
    player.position.set(0, cameraHeight, 0);
    player.add(camera); // Attach camera to player for pitch
    scene.add(player);

    // Don't create weapon here - wait for models to load

    // Add lighting
    createLighting(scene);

    // Setup controls
    setupControls(gameState, onWindowResize, resetGame);

    // Load all textures
    loadTextures();

    // Add god mode toggle (G key)
    document.addEventListener('keydown', (event) => {
        if (event.code === 'KeyG') {
            gameState.godMode = !gameState.godMode;
            console.log(`God Mode ${gameState.godMode ? 'ENABLED' : 'DISABLED'}`);

            // Visual feedback
            const godModeEl = document.getElementById('godMode') || createGodModeIndicator();
            godModeEl.style.display = gameState.godMode ? 'block' : 'none';
        }
    });
}

function loadTextures() {
    let texturesLoaded = 0;
    const totalTextures = 11; // 4 environment textures + 3 enemy textures + 1 bottle model + 1 flower model + 1 flower texture + 1 workstation model

    // Load environment textures
    wallTexture = textureLoader.load('textures/wall_metal_01.jpg',
        texture => { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texturesLoaded++; checkAllTexturesLoaded(); },
        undefined, () => { texturesLoaded++; checkAllTexturesLoaded(); });

    brickTexture = textureLoader.load('textures/wall_brick_01.png',
        texture => { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texturesLoaded++; checkAllTexturesLoaded(); },
        undefined, () => { texturesLoaded++; checkAllTexturesLoaded(); });

    floorTexture = textureLoader.load('textures/floor_stone_01.png',
        texture => { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texturesLoaded++; checkAllTexturesLoaded(); },
        undefined, () => { texturesLoaded++; checkAllTexturesLoaded(); });

    grateTexture = textureLoader.load('textures/floor_grate_01.png',
        texture => { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texturesLoaded++; checkAllTexturesLoaded(); },
        undefined, () => { texturesLoaded++; checkAllTexturesLoaded(); });

    // Load flower texture
    flowerTexture = textureLoader.load('textures/flowerLP_flowerLP_BaseColor.png',
        texture => { texturesLoaded++; checkAllTexturesLoaded(); },
        undefined, () => { texturesLoaded++; checkAllTexturesLoaded(); });

    // Load enemy logo textures
    [1, 2, 3].forEach(enemyType => {
        textureLoader.load(
            `textures/enemy_logo_0${enemyType}.png`,
            function(texture) {
                console.log(`Enemy logo ${enemyType} loaded successfully`);
                enemyTextures[enemyType] = texture;
                texturesLoaded++;
                checkAllTexturesLoaded();
            },
            function(progress) {
                console.log(`Loading enemy logo ${enemyType} progress:`, progress);
            },
            function(error) {
                console.error(`Error loading enemy logo ${enemyType}:`, error);
                texturesLoaded++;
                checkAllTexturesLoaded();
            }
        );
    });

    // Load water bottle model
    fbxLoader.load(
        'models/steel_bottle.fbx',
        function(object) {
            console.log('Bottle model loaded successfully');
            bottleModel = object;
            texturesLoaded++;
            checkAllTexturesLoaded();
        },
        function(progress) {
            console.log('Loading bottle model progress:', progress);
        },
        function(error) {
            console.error('Error loading bottle model:', error);
            texturesLoaded++;
            checkAllTexturesLoaded();
        }
    );

    // Load flower model
    fbxLoader.load(
        'models/flowerLP.fbx',
        function(object) {
            console.log('Flower model loaded successfully');
            flowerModel = object;
            texturesLoaded++;
            checkAllTexturesLoaded();
        },
        function(progress) {
            console.log('Loading flower model progress:', progress);
        },
        function(error) {
            console.error('Error loading flower model:', error);
            texturesLoaded++;
            checkAllTexturesLoaded();
        }
    );

    // Load workstation model
    fbxLoader.load(
        'models/Office_workstation.FBX',
        function(object) {
            console.log('Workstation model loaded successfully');
            workstationModel = object;
            texturesLoaded++;
            checkAllTexturesLoaded();
        },
        function(progress) {
            console.log('Loading workstation model progress:', progress);
        },
        function(error) {
            console.error('Error loading workstation model:', error);
            texturesLoaded++;
            checkAllTexturesLoaded();
        }
    );

    function checkAllTexturesLoaded() {
        if (texturesLoaded >= totalTextures) {
            console.log('All textures and models loaded, starting game...');
            // Create the weapon now that models are loaded
            weapon = createWeapon(camera, bottleModel);
            // Now create the level with the loaded textures
            createLevel();
            spawnEnemiesWrapper();

            // Start game loop
            animate();
        }
    }
}

function createGodModeIndicator() {
    const godModeEl = document.createElement('div');
    godModeEl.id = 'godMode';
    godModeEl.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        color: #ffff00;
        font-size: 18px;
        font-weight: bold;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        z-index: 1000;
        display: none;
    `;
    godModeEl.textContent = 'GOD MODE';
    document.body.appendChild(godModeEl);
    return godModeEl;
}

// createWeapon function now imported from gameSetup.js


function createLevel() {
    // Clear existing level objects
    clearLevel();

    // Update level data with current level
    levelData.currentLevel = gameState.currentLevel;

    // Generate the level layout
    generateLevel(levelData);

    // Calculate level bounds based on all rooms and corridors
    let minX = 0, maxX = 0, minZ = 0, maxZ = 0;

    // Check all rooms
    levelData.rooms.forEach(room => {
        const roomMinX = room.worldPos.x - room.width/2;
        const roomMaxX = room.worldPos.x + room.width/2;
        const roomMinZ = room.worldPos.z - room.height/2;
        const roomMaxZ = room.worldPos.z + room.height/2;

        minX = Math.min(minX, roomMinX);
        maxX = Math.max(maxX, roomMaxX);
        minZ = Math.min(minZ, roomMinZ);
        maxZ = Math.max(maxZ, roomMaxZ);
    });

    // Check all corridors
    levelData.corridors.forEach(corridor => {
        const corrMinX = corridor.worldPos.x - corridor.width/2;
        const corrMaxX = corridor.worldPos.x + corridor.width/2;
        const corrMinZ = corridor.worldPos.z - corridor.height/2;
        const corrMaxZ = corridor.worldPos.z + corridor.height/2;

        minX = Math.min(minX, corrMinX);
        maxX = Math.max(maxX, corrMaxX);
        minZ = Math.min(minZ, corrMinZ);
        maxZ = Math.max(maxZ, corrMaxZ);
    });

    // Add some padding
    const padding = 5;
    const levelWidth = (maxX - minX) + padding * 2;
    const levelHeight = (maxZ - minZ) + padding * 2;
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;

    // Create floor and ceiling sized to match the level
    const floorGeometry = new THREE.PlaneGeometry(levelWidth, levelHeight);
    const floorMaterial = new THREE.MeshLambertMaterial({
        map: floorTexture
    });
    if (floorTexture) {
        // Adjust texture tiling based on level size
        floorTexture.repeat.set(levelWidth / 4, levelHeight / 4);
    }
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(centerX, 0, centerZ);
    floor.receiveShadow = true;
    scene.add(floor);

    const ceilingMaterial = new THREE.MeshLambertMaterial({
        map: grateTexture || floorTexture
    });
    if (grateTexture) {
        // Adjust texture tiling based on level size
        grateTexture.repeat.set(levelWidth / 4, levelHeight / 4);
    }
    const ceiling = new THREE.Mesh(floorGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(centerX, 4, centerZ);
    scene.add(ceiling);

    // Build level using the simplified generator
    buildLevel(levelData, scene, createWall);

    // Add quotes to walls
    addWallQuotes(levelData, scene);

    // Add some global decorations within the level bounds
    createGlobalDecorations(levelWidth, levelHeight);

    // Add click event for weapon (only once)
    if (!gameState.weaponClickAdded) {
        document.addEventListener('click', () => {
            if (!gameState.isPointerLocked) {
                document.body.requestPointerLock();
            } else {
                fire();
            }
        });
        gameState.weaponClickAdded = true;
    }

    // Show level text
    showLevelText();

    // Position player at start
    player.position.set(levelData.startPos.x, cameraHeight, levelData.startPos.z);
}

function clearLevel() {
    // Remove existing walls, enemies, decorations
    walls.forEach(wall => scene.remove(wall));
    walls.length = 0;
    enemies.forEach(enemy => scene.remove(enemy.mesh));
    enemies.length = 0;
    bullets.forEach(bullet => scene.remove(bullet));
    bullets.length = 0;
    enemyProjectiles.forEach(proj => scene.remove(proj));
    enemyProjectiles.length = 0;
}


function createWall(position, size, textureType = 'metal') {
    const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);

    // Use simple white office walls instead of textures
    const material = new THREE.MeshLambertMaterial({
        color: 0xf5f5f5  // Off-white/whitewashed color
    });

    const wall = new THREE.Mesh(geometry, material);
    wall.position.set(position[0], position[1], position[2]);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    walls.push(wall);
}

function createGlobalDecorations(levelWidth, levelHeight) {
    // Add flowers only within level bounds
    if (flowerModel) {
        for (let i = 0; i < 4; i++) {
            const flower = flowerModel.clone();
            flower.scale.set(0.025, 0.025, 0.025);

            // Random position within level bounds
            const x = (Math.random() - 0.5) * (levelWidth - 4);
            const z = (Math.random() - 0.5) * (levelHeight - 4);

            // Check if position conflicts with level geometry
            if (!checkCollision(new THREE.Vector3(x, 0, z), new THREE.Vector3(2, 2, 2))) {
                flower.position.set(x, 0, z);
                flower.rotation.y = Math.random() * Math.PI * 2;

                flower.traverse(function(child) {
                    if (child.isMesh) {
                        if (flowerTexture) {
                            child.material = new THREE.MeshLambertMaterial({ map: flowerTexture });
                        } else {
                            child.material = new THREE.MeshLambertMaterial({ color: 0xFF69B4 });
                        }
                        child.castShadow = true;
                    }
                });

                scene.add(flower);
            }
        }
    }
}

function spawnEnemiesWrapper() {
    spawnEnemies(levelData, gameState, createEnemy);
}

function showLevelText() {
    const levelTextEl = document.getElementById('levelText');
    levelTextEl.textContent = `LEVEL ${gameState.currentLevel}`;
    levelTextEl.style.display = 'block';
    gameState.showingLevelText = true;

    setTimeout(() => {
        levelTextEl.style.display = 'none';
        gameState.showingLevelText = false;
    }, 2000);
}

function checkLevelCompletion() {
    if (gameState.levelCompleted) return;
    
    // Check if all enemies are dead
    if (enemies.length === 0) {
        completeLevel();
    }
}

function completeLevel() {
    gameState.levelCompleted = true;
    gameState.currentLevel++;

    // Increase enemy difficulty
    Object.keys(enemyTypes).forEach(type => {
        const enemy = enemyTypes[type];
        enemy.speed *= 1.1; // 10% faster each level
        enemy.fireRate *= 1.15; // 15% faster firing
        enemy.health = Math.floor(enemy.health * 1.05); // 5% more health
    });

    setTimeout(() => {
        gameState.levelCompleted = false;
        createLevel(); // Generate new level
        spawnEnemiesWrapper();

        // Reset player position to start position
        player.position.set(levelData.startPos.x, cameraHeight, levelData.startPos.z);

        // Restore some health and ammo
        gameState.health = Math.min(100, gameState.health + 25);
        gameState.ammo = Math.min(100, gameState.ammo + 20);
    }, 1000);
}

function createEnemy(position, type) {
    const enemyGeometry = new THREE.BoxGeometry(1, 2, 1);
    const enemyTypeData = enemyTypes[type];

    // Create materials for each face
    const materials = [];

    // Create 6 materials for the 6 faces of the cube
    for (let i = 0; i < 6; i++) {
        const material = new THREE.MeshLambertMaterial({ color: enemyTypeData.color });

        // Apply logo texture to the front face (face index 4)
        if (i === 4 && enemyTextures[type]) {
            material.map = enemyTextures[type];
            material.transparent = true;
        }

        materials.push(material);
    }

    const enemyMesh = new THREE.Mesh(enemyGeometry, materials);
    enemyMesh.position.copy(position);
    enemyMesh.castShadow = true;

    const enemy = {
        mesh: enemyMesh,
        type: type,
        health: enemyTypeData.health,
        maxHealth: enemyTypeData.health,
        speed: enemyTypeData.speed,
        fireRate: enemyTypeData.fireRate,
        lastShotTime: 0
    };

    enemies.push(enemy);
    scene.add(enemyMesh);
}

// createLighting function now imported from gameSetup.js

// setupControls function now imported from gameSetup.js

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function handleMovement(deltaTime) {
    const moveVector = new THREE.Vector3();

    // Get movement input
    if (gameState.keys['KeyW']) moveVector.z -= 1;
    if (gameState.keys['KeyS']) moveVector.z += 1;
    if (gameState.keys['KeyA']) moveVector.x -= 1;
    if (gameState.keys['KeyD']) moveVector.x += 1;

    // Normalize movement vector
    if (moveVector.length() > 0) {
        moveVector.normalize();

        // Apply player's rotation (yaw) to the movement vector
        moveVector.applyQuaternion(player.quaternion);

        // Calculate new position
        const newPosition = player.position.clone();
        newPosition.add(moveVector.multiplyScalar(moveSpeed * deltaTime));

        // Bounding box for the player
        const playerSize = new THREE.Vector3(0.8, cameraHeight, 0.8);

        // Simple collision detection
        if (!checkCollision(newPosition, playerSize)) {
            player.position.copy(newPosition);
        }
    }

    // Handle mouse look
    if (gameState.isPointerLocked) {
        // Yaw (left-right look) on the player object
        player.rotation.y -= gameState.mouseMovement.x;

        // Pitch (up-down look) on the camera object
        camera.rotation.x -= gameState.mouseMovement.y;

        // Clamp vertical rotation to prevent flipping
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));

        // Reset mouse movement after applying it
        gameState.mouseMovement.x = 0;
        gameState.mouseMovement.y = 0;
    }
}

// A more robust collision check using Bounding Boxes
function checkCollision(position, size) {
    const objectBox = new THREE.Box3();
    // Create the box at the potential new position to check for future collisions
    objectBox.setFromCenterAndSize(position, size);

    // Check against all walls
    for (const wall of walls) {
        const wallBox = new THREE.Box3().setFromObject(wall);
        if (objectBox.intersectsBox(wallBox)) {
            return true; // Collision detected
        }
    }

    return false; // No collision
}

function fire() {
    if (gameState.ammo <= 0) return;

    gameState.ammo--;
    
    // Play gunshot sound
    const gunshotSound = new Audio('sounds/submachine-gun-79846.mp3');
    gunshotSound.volume = 0.3; // Adjust volume (0.0 to 1.0)
    gunshotSound.play().catch(error => {
        console.log('Could not play gunshot sound:', error);
    });

    // Create a bullet
    const bulletGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

    // Set bullet's initial position and direction
    const vector = new THREE.Vector3();
    camera.getWorldDirection(vector);

    bullet.position.copy(player.position);
    bullet.velocity = vector.multiplyScalar(bulletSpeed);

    scene.add(bullet);
    bullets.push(bullet);

    // Muzzle flash
    const muzzleFlash = new THREE.PointLight(0xffcc00, 1, 5);
    muzzleFlash.position.copy(weapon.position);
    weapon.add(muzzleFlash);
    setTimeout(() => weapon.remove(muzzleFlash), 60);

    // --- Advanced Recoil ---

    // 1. Weapon visual recoil (kick back and up) - FIXED VERSION
    const originalPos = { x: weapon.position.x, y: weapon.position.y, z: weapon.position.z };
    new TWEEN.Tween(weapon.position)
        .to({ z: originalPos.z + 0.2, y: originalPos.y - 0.05 }, 70)
        .yoyo(true)
        .repeat(1)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onComplete(() => {
            // Ensure it returns to exact original position
            weapon.position.set(originalPos.x, originalPos.y, originalPos.z);
        })
        .start();

    // 2. Camera recoil (kick up and settle back down)
    const initialCameraX = camera.rotation.x;
    const recoilAmount = 0.03;

    new TWEEN.Tween({ x: initialCameraX })
        .to({ x: initialCameraX - recoilAmount }, 80)
        .yoyo(true)
        .repeat(1)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate((obj) => {
            camera.rotation.x = obj.x;
        })
        .start();
}

function updateBullets(deltaTime) {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        // Move the bullet
        bullet.position.add(bullet.velocity.clone().multiplyScalar(deltaTime));

        // Check for collision
        let hit = false;
        const bulletBox = new THREE.Box3().setFromObject(bullet);

        // Check against walls
        for(const wall of walls) {
            const wallBox = new THREE.Box3().setFromObject(wall);
            if(bulletBox.intersectsBox(wallBox)) {
                hit = true;
                break;
            }
        }

        // Check against enemies
        if (!hit) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                const enemyBox = new THREE.Box3().setFromObject(enemy.mesh);

                if (bulletBox.intersectsBox(enemyBox)) {
                    hit = true;
                    enemy.health -= 25; // Damage

                    if (enemy.health <= 0) {
                        scene.remove(enemy.mesh);
                        enemies.splice(j, 1);
                    }
                    break;
                }
            }
        }

        // Remove bullet if it hits something or goes too far
        const distance = bullet.position.distanceTo(player.position);
        if (hit || distance > 100) {
            scene.remove(bullet);
            bullets.splice(i, 1);
        }
    }
}

function updateEnemies(deltaTime) {
    const currentTime = clock.getElapsedTime();

    enemies.forEach(enemy => {
        const distanceToPlayer = enemy.mesh.position.distanceTo(player.position);

        // --- AI BEHAVIOR ---

        // 1. Look at the player
        enemy.mesh.lookAt(player.position);

        // 2. Move towards the player (use individual enemy speed)
        // Don't get too close, and don't move if player is very far away.
        if (distanceToPlayer > 4 && distanceToPlayer < 40) {
            const direction = new THREE.Vector3();
            direction.subVectors(player.position, enemy.mesh.position).normalize();

            const moveStep = direction.multiplyScalar(enemy.speed * deltaTime);
            const newPosition = enemy.mesh.position.clone().add(moveStep);

            // Correctly define the enemy's size for collision checking
            const enemySize = new THREE.Vector3(
                enemy.mesh.geometry.parameters.width,
                enemy.mesh.geometry.parameters.height,
                enemy.mesh.geometry.parameters.depth
            );

            // Check for wall collisions before moving
            if (!checkCollision(newPosition, enemySize)) {
                enemy.mesh.position.copy(newPosition);
            }
        }

        // 3. Firing logic (use individual enemy fire rate)
        if (currentTime - enemy.lastShotTime > 1 / enemy.fireRate) {
            // Only fire if player is within attack range
            if (distanceToPlayer < 30) {
                enemyFire(enemy);
                enemy.lastShotTime = currentTime;
            }
        }
    });
}

function enemyFire(enemy) {
    const projectileGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const projectileMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);

    // Get direction from enemy to player
    const direction = new THREE.Vector3();
    direction.subVectors(player.position, enemy.mesh.position).normalize();

    projectile.position.copy(enemy.mesh.position);
    projectile.velocity = direction.multiplyScalar(enemyProjectileSpeed);

    enemyProjectiles.push(projectile);
    scene.add(projectile);
}

function updateEnemyProjectiles(deltaTime) {
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const projectile = enemyProjectiles[i];
        projectile.position.add(projectile.velocity.clone().multiplyScalar(deltaTime));

        let hit = false;
        const projectileBox = new THREE.Box3().setFromObject(projectile);

        // Check collision with player
        const playerSize = new THREE.Vector3(0.8, cameraHeight, 0.8);
        const playerBox = new THREE.Box3().setFromCenterAndSize(player.position, playerSize);
        if (projectileBox.intersectsBox(playerBox)) {
            hit = true;

            // Only apply damage if god mode is disabled
            if (!gameState.godMode) {
                gameState.health -= 10;
                showDamageFlash(); // Flash red when hit
                if (gameState.health <= 0) {
                    gameState.health = 0;
                    gameState.playerIsDead = true;
                }
            }
        }

        // Check collision with walls
        if (!hit) {
            for (const wall of walls) {
                const wallBox = new THREE.Box3().setFromObject(wall);
                if (projectileBox.intersectsBox(wallBox)) {
                    hit = true;
                    break;
                }
            }
        }

        const distance = projectile.position.distanceTo(player.position);
        if (hit || distance > 100) {
            scene.remove(projectile);
            enemyProjectiles.splice(i, 1);
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    // If player is dead, do nothing
    if (gameState.playerIsDead) {
        showGameOver();
        return;
    }

    // Required for tweening
    TWEEN.update();

    const deltaTime = clock.getDelta();

    // Handle movement
    handleMovement(deltaTime);

    // Update bullets
    updateBullets(deltaTime);

    // Update enemies
    updateEnemies(deltaTime);
    updateEnemyProjectiles(deltaTime);

    // Update HUD
    updateHUD();
    
    // Slowly recover health over time
    updateHealthRecovery(deltaTime);

    // Check for level completion
    checkLevelCompletion();

    // Render
    renderer.render(scene, camera);
}

function updateHUD() {
    document.getElementById('health').textContent = gameState.health;
    document.getElementById('ammo').textContent = gameState.ammo;

    // Update god mode indicator if it exists
    const godModeEl = document.getElementById('godMode');
    if (godModeEl) {
        godModeEl.style.display = gameState.godMode ? 'block' : 'none';
    }
}

function updateHealthRecovery(deltaTime) {
    // Slowly recover health over time (1 health per 3 seconds)
    const healthRecoveryRate = 1 / 3; // health per second
    
    if (gameState.health < 100 && !gameState.playerIsDead) {
        gameState.health += healthRecoveryRate * deltaTime;
        gameState.health = Math.min(100, Math.floor(gameState.health)); // Cap at 100 and round down
    }
}

function showDamageFlash() {
    const damageOverlay = document.getElementById('damageOverlay');
    damageOverlay.style.display = 'block';
    
    // Fade out the damage overlay
    setTimeout(() => {
        damageOverlay.style.display = 'none';
    }, 150); // Show for 150ms
}

function showGameOver() {
    const gameOverScreen = document.getElementById('gameOverScreen');
    
    // Only set quote if game over screen is not already showing
    if (gameOverScreen.style.display !== 'flex') {
        // Play game over sound
        const gameOverSound = new Audio('sounds/080205_life-lost-game-over-89697.mp3');
        gameOverSound.volume = 0.625; // 25% louder (0.5 * 1.25)
        gameOverSound.play().catch(error => {
            console.log('Could not play game over sound:', error);
        });
        
        // Array of Ben quotes
        const benQuotes = [
            "We're on the high road to anarchy",
            "We're just putting lipstick on a pig. But sometimes what the pig needs is lipstick",
            "I would describe that as criminally optimistic",
            "Every time I hear 'form data' is a stab to my heart",
            "As the system grows, there are more things"
        ];
        
        // Select a random quote
        const randomQuote = benQuotes[Math.floor(Math.random() * benQuotes.length)];
        document.getElementById('benQuote').textContent = `"${randomQuote}"`;
        
        gameOverScreen.style.display = 'flex';
        if (gameState.isPointerLocked) {
            document.exitPointerLock();
        }
    }
}

function resetGame() {
    // Hide game over screen
    document.getElementById('gameOverScreen').style.display = 'none';

    // Reset game state
    gameState.health = 100;
    gameState.ammo = 50;
    gameState.playerIsDead = false;

    // Reset player position
    player.position.set(0, cameraHeight, 0);
    camera.rotation.set(0, 0, 0);

    // Clear out old game objects
    bullets.forEach(b => scene.remove(b));
    bullets.length = 0;
    enemyProjectiles.forEach(p => scene.remove(p));
    enemyProjectiles.length = 0;
    enemies.forEach(e => scene.remove(e.mesh));
    enemies.length = 0;

    // Respawn enemies (with their types)
    spawnEnemiesWrapper();

    // Relock pointer
    document.body.requestPointerLock();
}

// Start the game when the page loads
window.addEventListener('load', init);
