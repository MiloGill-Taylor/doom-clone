import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

// Create weapon function
export function createWeapon(camera, bottleModel) {
    let weapon;
    
    if (bottleModel) {
        // Use the loaded bottle model
        weapon = bottleModel.clone();
        
        // Apply simple material to avoid lighting issues
        weapon.traverse(function(child) {
            if (child.isMesh) {
                child.material = new THREE.MeshBasicMaterial({
                    color: 0x808080,
                    wireframe: false
                });
                child.castShadow = true;
            }
        });
        
        // Scale and position - make it visible
        weapon.scale.set(0.05, 0.05, 0.05);
        
        // Position and orient bottle so top points forward like gun muzzle
        weapon.position.set(0.4, -0.6, -1.5);
        weapon.rotation.set(0, Math.PI/2, Math.PI/2); // Rotate so top points forward
        
        console.log('Using water bottle model');
        console.log('Bottle model children count:', weapon.children.length);
        console.log('Bottle model bounding box:', new THREE.Box3().setFromObject(weapon));
        console.log('Bottle model position:', weapon.position);
        console.log('Bottle model scale:', weapon.scale);
    } else {
        // Hide weapon for now - create invisible placeholder
        const weaponGeometry = new THREE.BoxGeometry(0.01, 0.01, 0.01);
        const weaponMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0
        });
        weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        
        // Position the invisible weapon
        weapon.position.set(0, 0, 0);
        
        console.log('Weapon hidden - using invisible placeholder');
    }

    // Add the weapon as a child of the camera
    camera.add(weapon);
    return weapon;
}

// Create lighting setup
export function createLighting(scene) {
    // Much brighter ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    // Brighter directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // Additional fill light
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-10, 10, -5);
    scene.add(fillLight);

    // Point lights for atmosphere (reduced intensity since we have more ambient)
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    for (let i = 0; i < 4; i++) {
        const pointLight = new THREE.PointLight(colors[i], 0.3, 15);
        pointLight.position.set(
            (Math.random() - 0.5) * 40,
            3,
            (Math.random() - 0.5) * 40
        );
        scene.add(pointLight);
    }
}

// Setup controls
export function setupControls(gameState, onWindowResize, resetGame) {
    // Keyboard events
    document.addEventListener('keydown', (event) => {
        gameState.keys[event.code] = true;
    });

    document.addEventListener('keyup', (event) => {
        gameState.keys[event.code] = false;
    });

    // Mouse events
    document.addEventListener('mousemove', (event) => {
        if (gameState.isPointerLocked) {
            gameState.mouseMovement.x = event.movementX * 0.002; // mouseSensitivity
            gameState.mouseMovement.y = event.movementY * 0.002;
        }
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement === document.body) {
            gameState.isPointerLocked = true;
        } else {
            gameState.isPointerLocked = false;
        }
    });

    // Restart button
    document.getElementById('restartButton').addEventListener('click', () => {
        resetGame();
    });

    // Window resize
    window.addEventListener('resize', onWindowResize);
}

// Load all textures and models
export function loadAssets(textureLoader, fbxLoader, checkAllAssetsLoaded) {
    let assetsLoaded = 0;
    const totalAssets = 11; // 4 environment textures + 3 enemy textures + 1 bottle model + 1 flower model + 1 flower texture + 1 workstation model

    const assets = {
        wallTexture: null,
        brickTexture: null,
        floorTexture: null,
        grateTexture: null,
        flowerTexture: null,
        enemyTextures: {},
        bottleModel: null,
        flowerModel: null,
        workstationModel: null
    };

    // Load environment textures
    assets.wallTexture = textureLoader.load('textures/wall_metal_01.jpg', 
        texture => { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; assetsLoaded++; checkAllAssetsLoaded(); },
        undefined, () => { assetsLoaded++; checkAllAssetsLoaded(); });
    
    assets.brickTexture = textureLoader.load('textures/wall_brick_01.png',
        texture => { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; assetsLoaded++; checkAllAssetsLoaded(); },
        undefined, () => { assetsLoaded++; checkAllAssetsLoaded(); });
    
    assets.floorTexture = textureLoader.load('textures/floor_stone_01.png',
        texture => { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; assetsLoaded++; checkAllAssetsLoaded(); },
        undefined, () => { assetsLoaded++; checkAllAssetsLoaded(); });
    
    assets.grateTexture = textureLoader.load('textures/floor_grate_01.png',
        texture => { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; assetsLoaded++; checkAllAssetsLoaded(); },
        undefined, () => { assetsLoaded++; checkAllAssetsLoaded(); });

    // Load flower texture
    assets.flowerTexture = textureLoader.load('textures/flowerLP_flowerLP_BaseColor.png',
        texture => { assetsLoaded++; checkAllAssetsLoaded(); },
        undefined, () => { assetsLoaded++; checkAllAssetsLoaded(); });

    // Load enemy logo textures
    [1, 2, 3].forEach(enemyType => {
        textureLoader.load(
            `textures/enemy_logo_0${enemyType}.png`,
            function(texture) {
                console.log(`Enemy logo ${enemyType} loaded successfully`);
                assets.enemyTextures[enemyType] = texture;
                assetsLoaded++;
                checkAllAssetsLoaded();
            },
            function(progress) {
                console.log(`Loading enemy logo ${enemyType} progress:`, progress);
            },
            function(error) {
                console.error(`Error loading enemy logo ${enemyType}:`, error);
                assetsLoaded++;
                checkAllAssetsLoaded();
            }
        );
    });

    // Load water bottle model
    fbxLoader.load(
        'models/steel_bottle.fbx',
        function(object) {
            console.log('Bottle model loaded successfully');
            assets.bottleModel = object;
            assetsLoaded++;
            checkAllAssetsLoaded();
        },
        function(progress) {
            console.log('Loading bottle model progress:', progress);
        },
        function(error) {
            console.error('Error loading bottle model:', error);
            assetsLoaded++;
            checkAllAssetsLoaded();
        }
    );

    // Load flower model
    fbxLoader.load(
        'models/flowerLP.fbx',
        function(object) {
            console.log('Flower model loaded successfully');
            assets.flowerModel = object;
            assetsLoaded++;
            checkAllAssetsLoaded();
        },
        function(progress) {
            console.log('Loading flower model progress:', progress);
        },
        function(error) {
            console.error('Error loading flower model:', error);
            assetsLoaded++;
            checkAllAssetsLoaded();
        }
    );

    // Load workstation model
    fbxLoader.load(
        'models/Office_workstation.FBX',
        function(object) {
            console.log('Workstation model loaded successfully');
            assets.workstationModel = object;
            assetsLoaded++;
            checkAllAssetsLoaded();
        },
        function(progress) {
            console.log('Loading workstation model progress:', progress);
        },
        function(error) {
            console.error('Error loading workstation model:', error);
            assetsLoaded++;
            checkAllAssetsLoaded();
        }
    );

    return { assets, totalAssets, getCurrentCount: () => assetsLoaded };
}