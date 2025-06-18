import * as THREE from 'three';

// Wall quotes
const wallQuotes = [
    "We're on the high road to anarchy",
    "We're just putting lipstick on a pig. But sometimes what the pig needs is lipstick",
    "I would describe that as criminally optimistic",
    "Every time I hear 'form data' is a stab to my heart",
    "As the system grows, there are more things"
];

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
    } else {
        // For levels 3+, use a variation of level 2 for now
        generateLevel2(levelData);
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

export function buildLevel(levelData, scene, createWall) {
    console.log('Building level geometry...');

    // Build corridors first
    levelData.corridors.forEach(corridor => {
        buildCorridor(corridor, scene, createWall);
    });

    // Build rooms
    levelData.rooms.forEach(room => {
        buildRoom(room, scene, createWall);
    });

    // Add outer perimeter walls for level 2 to prevent walking outside
    if (levelData.currentLevel === 2) {
        addPerimeterWalls(levelData, scene, createWall);
    }

    // Add end marker (red sphere)
    const endMarker = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 16),
        new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0x440000 })
    );
    endMarker.position.set(levelData.endPos.x, 2, levelData.endPos.z);
    scene.add(endMarker);
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
    // Large room (z=0) needs: north opening (from start corridor), south opening (to middle corridor)
    // Final room (z=-40) needs: north opening (from middle corridor)
    const needsNorthOpening = (room.type === 'combat' && z === 0) || (room.type === 'end' && z === -40);
    const needsSouthOpening = (room.type === 'combat' && z === 0);

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
    // Starting corridor (z=20): needs NORTH opening (to large room)
    // Middle corridor (z=-20): needs NORTH opening (from large room) and SOUTH opening (to final room)
    const needsNorthOpening = (z === 20) || (z === -20); // Both corridors need north openings
    const needsSouthOpening = (z === -20); // Only middle corridor needs south opening

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

    createWall([x - width/2, 2, z], [1, 4, height], 'metal'); // West wall
    createWall([x + width/2, 2, z], [1, 4, height], 'metal'); // East wall

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

export function addWallQuotes(levelData, scene) {
    // Add quotes to combat rooms
    const quotableRooms = levelData.rooms.filter(r => r.type === 'combat');

    if (quotableRooms.length > 0) {
        const room = quotableRooms[0]; // Use first combat room
        const quote = wallQuotes[Math.floor(Math.random() * wallQuotes.length)];

        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 128;
        const context = canvas.getContext('2d');

        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#00ff00';
        context.font = 'bold 20px monospace';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        // Simple text wrapping
        const maxWidth = canvas.width - 40;
        const words = quote.split(' ');
        let lines = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = context.measureText(testLine);
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);

        const lineHeight = 25;
        const startY = (canvas.height - lines.length * lineHeight) / 2 + lineHeight / 2;
        lines.forEach((line, index) => {
            context.fillText(line, canvas.width / 2, startY + index * lineHeight);
        });

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshLambertMaterial({ map: texture });
        const geometry = new THREE.PlaneGeometry(8, 2);
        const textPlane = new THREE.Mesh(geometry, material);

        // Position on room wall
        textPlane.position.set(room.worldPos.x, 2.5, room.worldPos.z - room.height/2 + 0.1);
        textPlane.rotation.y = 0;
        scene.add(textPlane);
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
