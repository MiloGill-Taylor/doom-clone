import * as THREE from 'three';



// Level configurations
const ROOM_SIZE = 20; // Single room size for level 1
const CORRIDOR_WIDTH = 6; // Width of corridors
const CORRIDOR_LENGTH = 15; // Length of corridors

export function generateLevel(levelData) {
    const currentLevel = levelData.currentLevel || 1;
    console.log(`Generating hardcoded level ${currentLevel}...`);

    // Clear previous level data
    levelData.rooms = [];
    levelData.corridors = [];
    levelData.sideRooms = [];
    levelData.doors = [];

    if (currentLevel === 1) {
        generateLevel1(levelData);
    } else if (currentLevel === 2) {
        generateLevel2(levelData);
    } else if (currentLevel === 3) {
        generateLevel3(levelData);
    } else {
        // For levels 4+, use a variation of level 3 for now
        generateLevel3(levelData);
    }

    console.log(`Level ${currentLevel} generated: ${levelData.rooms.length} rooms, ${levelData.corridors.length} corridors`);
}

function generateLevel1(levelData) {
    // Create a single simple room (existing level 1)
    const room = {
        worldPos: { x: 0, z: 0 },
        width: ROOM_SIZE,
        height: ROOM_SIZE,
        type: 'start',
        enemies: 3,
        cover: 2
    };

    levelData.rooms.push(room);
    levelData.startPos = { x: 0, z: ROOM_SIZE/2 - 2 };
    levelData.endPos = { x: 0, z: -ROOM_SIZE/2 + 2 };
}

function generateLevel2(levelData) {
    // Level 2: Corridor -> Large Room -> Corridor -> Final Room

    // Starting corridor (narrow)
    const startCorridor = {
        worldPos: { x: 0, z: 20 },
        width: CORRIDOR_WIDTH,
        height: CORRIDOR_LENGTH,
        type: 'corridor',
        enemies: 1,
        cover: 1
    };

    // Large combat room with obstacles
    const largeRoom = {
        worldPos: { x: 0, z: 0 },
        width: 25,
        height: 20,
        type: 'combat',
        enemies: 5,
        cover: 4
    };

    // Second corridor
    const middleCorridor = {
        worldPos: { x: 0, z: -20 },
        width: CORRIDOR_WIDTH,
        height: CORRIDOR_LENGTH,
        type: 'corridor',
        enemies: 2,
        cover: 1
    };

    // Final room with end marker
    const finalRoom = {
        worldPos: { x: 0, z: -40 },
        width: 15,
        height: 12,
        type: 'end',
        enemies: 3,
        cover: 2
    };

    levelData.rooms.push(largeRoom, finalRoom);
    levelData.corridors.push(startCorridor, middleCorridor);

    // Player starts at the back of the first corridor
    levelData.startPos = { x: 0, z: startCorridor.worldPos.z + startCorridor.height/2 - 2 };

    // End position is in the final room
    levelData.endPos = { x: 0, z: finalRoom.worldPos.z };
}

function generateLevel3(levelData) {
    // Level 3: Large Room -> Complex Corridor Path -> Large Final Room
    // Create corridors that connect perfectly with no gaps

    // Starting large room with more enemies and cover
    const startRoom = {
        worldPos: { x: 0, z: 0 },
        width: 30,
        height: 25,
        type: 'combat',
        enemies: 8,
        cover: 6
    };

    // Create a continuous path: straight -> right -> left -> left -> right
    // Each corridor connects exactly to the next one

    // Corridor 1: Straight up from start room
    const corridor1 = {
        worldPos: { x: 0, z: 25 },
        width: CORRIDOR_WIDTH,
        height: 20,
        type: 'corridor',
        enemies: 2,
        cover: 1
    };

    // Corridor 2: Right turn (horizontal going right)
    const corridor2 = {
        worldPos: { x: 10, z: 35 },
        width: 20,
        height: CORRIDOR_WIDTH,
        type: 'corridor',
        enemies: 1,
        cover: 1
    };

    // Corridor 3: Left turn (vertical going up)
    const corridor3 = {
        worldPos: { x: 20, z: 50 },
        width: CORRIDOR_WIDTH,
        height: 20,
        type: 'corridor',
        enemies: 2,
        cover: 1
    };

    // Corridor 4: Left turn (horizontal going left)
    const corridor4 = {
        worldPos: { x: 10, z: 60 },
        width: 20,
        height: CORRIDOR_WIDTH,
        type: 'corridor',
        enemies: 1,
        cover: 1
    };

    // Corridor 5: Right turn (vertical to final room)
    const corridor5 = {
        worldPos: { x: 0, z: 75 },
        width: CORRIDOR_WIDTH,
        height: 20,
        type: 'corridor',
        enemies: 2,
        cover: 1
    };

    // Final large room
    const finalRoom = {
        worldPos: { x: 0, z: 100 },
        width: 28,
        height: 22,
        type: 'end',
        enemies: 7,
        cover: 5
    };

    levelData.rooms.push(startRoom, finalRoom);
    levelData.corridors.push(corridor1, corridor2, corridor3, corridor4, corridor5);

    // Player starts in the starting room
    levelData.startPos = { x: 0, z: -10 };

    // End position is in the final room
    levelData.endPos = { x: 0, z: 105 };
}

export function buildLevel(levelData, scene, createWall, endMarkerRef) {
    console.log('Building level geometry...');

    // Build corridors first
    levelData.corridors.forEach(corridor => {
        buildCorridor(corridor, scene, createWall);
    });

    // Build rooms
    levelData.rooms.forEach(room => {
        buildRoom(room, scene, createWall);
    });

    // Add outer perimeter walls for level 2+ to prevent walking outside
    if (levelData.currentLevel >= 2) {
        addPerimeterWalls(levelData, scene, createWall);
    }



    // Add end marker (red sphere)
    const newEndMarker = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 16),
        new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0x440000 })
    );
    newEndMarker.position.set(levelData.endPos.x, 2, levelData.endPos.z);
    scene.add(newEndMarker);

    // Return the end marker so it can be stored for cleanup
    return newEndMarker;
}



function addPerimeterWalls(levelData, scene, createWall) {
    // Calculate overall level bounds
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

    // Add padding and create outer walls
    const padding = 3;
    const outerMinX = minX - padding;
    const outerMaxX = maxX + padding;
    const outerMinZ = minZ - padding;
    const outerMaxZ = maxZ + padding;
    const centerX = (outerMinX + outerMaxX) / 2;
    const centerZ = (outerMinZ + outerMaxZ) / 2;
    const outerWidth = outerMaxX - outerMinX;
    const outerHeight = outerMaxZ - outerMinZ;

    // Create outer perimeter walls
    createWall([centerX, 2, outerMinZ], [outerWidth, 4, 1], 'metal'); // North outer wall
    createWall([centerX, 2, outerMaxZ], [outerWidth, 4, 1], 'metal'); // South outer wall
    createWall([outerMinX, 2, centerZ], [1, 4, outerHeight], 'metal'); // West outer wall
    createWall([outerMaxX, 2, centerZ], [1, 4, outerHeight], 'metal'); // East outer wall
}

function buildRoom(room, scene, createWall) {
    const width = room.width;
    const height = room.height;
    const x = room.worldPos.x;
    const z = room.worldPos.z;

    // Determine which walls need openings based on level layout
    let needsNorthOpening = false;
    let needsSouthOpening = false;

    // Level 2 logic
    if (room.type === 'combat' && z === 0) {
        needsNorthOpening = true;
        needsSouthOpening = true;
    } else if (room.type === 'end' && z === -40) {
        needsNorthOpening = true;
    }

    // Level 3 logic
    if (room.type === 'combat' && z === 0) {
        // Starting room of level 3 - needs north opening
        needsNorthOpening = true;
    } else if (room.type === 'end' && z === 100) {
        // Final room of level 3 - needs south opening
        needsSouthOpening = true;
    }

    // Create room walls with openings where needed
    if (!needsNorthOpening) {
        createWall([x, 2, z - height/2], [width, 4, 1], 'brick'); // North wall
    } else {
        // Create north wall with opening (split into two parts)
        const openingWidth = 4; // Width of the opening
        const wallPartWidth = (width - openingWidth) / 2;

        createWall([x - openingWidth/2 - wallPartWidth/2, 2, z - height/2], [wallPartWidth, 4, 1], 'brick'); // North wall left
        createWall([x + openingWidth/2 + wallPartWidth/2, 2, z - height/2], [wallPartWidth, 4, 1], 'brick'); // North wall right
    }

    if (!needsSouthOpening) {
        createWall([x, 2, z + height/2], [width, 4, 1], 'brick'); // South wall
    } else {
        // Create south wall with opening (split into two parts)
        const openingWidth = 4; // Width of the opening
        const wallPartWidth = (width - openingWidth) / 2;

        createWall([x - openingWidth/2 - wallPartWidth/2, 2, z + height/2], [wallPartWidth, 4, 1], 'brick'); // South wall left
        createWall([x + openingWidth/2 + wallPartWidth/2, 2, z + height/2], [wallPartWidth, 4, 1], 'brick'); // South wall right
    }

    createWall([x - width/2, 2, z], [1, 4, height], 'brick'); // West wall
    createWall([x + width/2, 2, z], [1, 4, height], 'brick'); // East wall

    // Add cover objects
    for (let i = 0; i < room.cover; i++) {
        const coverX = x + (Math.random() - 0.5) * (width - 4);
        const coverZ = z + (Math.random() - 0.5) * (height - 4);

        const cover = new THREE.Mesh(
            new THREE.BoxGeometry(2, 1.5, 1),
            new THREE.MeshLambertMaterial({ color: 0x8B4513 })
        );
        cover.position.set(coverX, 0.75, coverZ);
        cover.castShadow = true;
        scene.add(cover);
    }
}

function buildCorridor(corridor, scene, createWall) {
    const width = corridor.width;
    const height = corridor.height;
    const x = corridor.worldPos.x;
    const z = corridor.worldPos.z;

    // Determine which walls need openings based on corridor position and flow direction
    let needsNorthOpening = false;
    let needsSouthOpening = false;
    let needsEastOpening = false;
    let needsWestOpening = false;

    // Level 2 corridor logic
    if (z === 20) {
        needsNorthOpening = true; // Starting corridor needs north opening to large room
    } else if (z === -20) {
        needsNorthOpening = true; // Middle corridor needs north opening from large room
        needsSouthOpening = true; // Middle corridor needs south opening to final room
    }

    // Level 3 corridor logic - simplified connections
    if (z === 25 && x === 0) {
        // Corridor 1: connects start room to corridor 2
        needsSouthOpening = true; // From start room
        needsNorthOpening = true; // To corridor 2
    } else if (z === 35 && x === 10) {
        // Corridor 2: horizontal connector
        needsWestOpening = true; // From corridor 1
        needsEastOpening = true; // To corridor 3
    } else if (z === 50 && x === 20) {
        // Corridor 3: vertical connector
        needsSouthOpening = true; // From corridor 2
        needsNorthOpening = true; // To corridor 4
    } else if (z === 60 && x === 10) {
        // Corridor 4: horizontal connector
        needsEastOpening = true; // From corridor 3
        needsWestOpening = true; // To corridor 5
    } else if (z === 75 && x === 0) {
        // Corridor 5: connects to final room
        needsSouthOpening = true; // From corridor 4
        needsNorthOpening = true; // To final room
    }

    // Create corridor walls with openings where needed
    if (!needsNorthOpening) {
        createWall([x, 2, z - height/2], [width, 4, 1], 'metal'); // North wall
    } else {
        // Create north wall with opening (split into two parts)
        const openingWidth = 4; // Width of the opening
        const wallPartWidth = (width - openingWidth) / 2;

        createWall([x - openingWidth/2 - wallPartWidth/2, 2, z - height/2], [wallPartWidth, 4, 1], 'metal'); // North wall left
        createWall([x + openingWidth/2 + wallPartWidth/2, 2, z - height/2], [wallPartWidth, 4, 1], 'metal'); // North wall right
    }

    if (!needsSouthOpening) {
        createWall([x, 2, z + height/2], [width, 4, 1], 'metal'); // South wall
    } else {
        // Create south wall with opening (split into two parts)
        const openingWidth = 4; // Width of the opening
        const wallPartWidth = (width - openingWidth) / 2;

        createWall([x - openingWidth/2 - wallPartWidth/2, 2, z + height/2], [wallPartWidth, 4, 1], 'metal'); // South wall left
        createWall([x + openingWidth/2 + wallPartWidth/2, 2, z + height/2], [wallPartWidth, 4, 1], 'metal'); // South wall right
    }

    // Create east and west walls with openings if needed
    if (!needsWestOpening) {
        createWall([x - width/2, 2, z], [1, 4, height], 'metal'); // West wall
    } else {
        // Create west wall with opening (split into two parts)
        const openingWidth = 4; // Width of the opening
        const wallPartHeight = (height - openingWidth) / 2;

        createWall([x - width/2, 2, z - openingWidth/2 - wallPartHeight/2], [1, 4, wallPartHeight], 'metal'); // West wall top
        createWall([x - width/2, 2, z + openingWidth/2 + wallPartHeight/2], [1, 4, wallPartHeight], 'metal'); // West wall bottom
    }

    if (!needsEastOpening) {
        createWall([x + width/2, 2, z], [1, 4, height], 'metal'); // East wall
    } else {
        // Create east wall with opening (split into two parts)
        const openingWidth = 4; // Width of the opening
        const wallPartHeight = (height - openingWidth) / 2;

        createWall([x + width/2, 2, z - openingWidth/2 - wallPartHeight/2], [1, 4, wallPartHeight], 'metal'); // East wall top
        createWall([x + width/2, 2, z + openingWidth/2 + wallPartHeight/2], [1, 4, wallPartHeight], 'metal'); // East wall bottom
    }

    // Add some cover objects in corridors
    for (let i = 0; i < corridor.cover; i++) {
        const coverX = x + (Math.random() - 0.5) * (width - 3);
        const coverZ = z + (Math.random() - 0.5) * (height - 3);

        const cover = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 1.2, 1.5),
            new THREE.MeshLambertMaterial({ color: 0x666666 })
        );
        cover.position.set(coverX, 0.6, coverZ);
        cover.castShadow = true;
        scene.add(cover);
    }
}



export function spawnEnemies(levelData, gameState, createEnemy) {
    // Spawn enemies in rooms
    levelData.rooms.forEach(room => {
        for (let i = 0; i < room.enemies; i++) {
            const enemyType = Math.ceil(Math.random() * 3);

            const x = room.worldPos.x + (Math.random() - 0.5) * (room.width - 6);
            const z = room.worldPos.z + (Math.random() - 0.5) * (room.height - 6);

            createEnemy(new THREE.Vector3(x, 1.5, z), enemyType);
        }
    });

    // Spawn enemies in corridors
    levelData.corridors.forEach(corridor => {
        for (let i = 0; i < corridor.enemies; i++) {
            const enemyType = Math.ceil(Math.random() * 3);

            const x = corridor.worldPos.x + (Math.random() - 0.5) * (corridor.width - 3);
            const z = corridor.worldPos.z + (Math.random() - 0.5) * (corridor.height - 3);

            createEnemy(new THREE.Vector3(x, 1.5, z), enemyType);
        }
    });
}
