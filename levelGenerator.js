import * as THREE from 'three';

// Wall quotes
const wallQuotes = [
    "We're on the high road to anarchy",
    "We're just putting lipstick on a pig. But sometimes what the pig needs is lipstick",
    "I would describe that as criminally optimistic",
    "Every time I hear 'form data' is a stab to my heart",
    "As the system grows, there are more things"
];

// Simple room configuration
const ROOM_SIZE = 20; // Single room size (20x20 units)

export function generateLevel(levelData) {
    console.log(`Generating simple single room level...`);

    // Clear previous level data
    levelData.rooms = [];
    levelData.corridors = [];
    levelData.sideRooms = [];
    levelData.doors = [];

    // Create a single simple room
    const room = {
        worldPos: { x: 0, z: 0 }, // Center the room at origin
        width: ROOM_SIZE,
        height: ROOM_SIZE,
        type: 'start',
        enemies: 3, // A few enemies to test with
        cover: 2 // Some cover objects
    };

    levelData.rooms.push(room);

    // Set player start position (back of room)
    levelData.startPos = { x: 0, z: ROOM_SIZE/2 - 2 };

    // Set end position (front of room) with red marker
    levelData.endPos = { x: 0, z: -ROOM_SIZE/2 + 2 };

    console.log(`Simple level generated: 1 room at origin`);
}

export function buildLevel(levelData, scene, createWall) {
    console.log('Building simple level geometry...');

    // Build the single room
    levelData.rooms.forEach(room => {
        buildRoom(room, scene, createWall);
    });
}

function buildRoom(room, scene, createWall) {
    const width = room.width;
    const height = room.height;
    const x = room.worldPos.x;
    const z = room.worldPos.z;

    // Create room walls
    createWall([x, 2, z - height/2], [width, 4, 1], 'brick'); // North wall
    createWall([x, 2, z + height/2], [width, 4, 1], 'brick'); // South wall
    createWall([x - width/2, 2, z], [1, 4, height], 'brick'); // West wall
    createWall([x + width/2, 2, z], [1, 4, height], 'brick'); // East wall

    // Add some cover objects
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

export function addWallQuotes(levelData, scene) {
    // Add a quote to the room wall
    const room = levelData.rooms[0]; // Only one room
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

    // Position on north wall
    textPlane.position.set(0, 2.5, -ROOM_SIZE/2 + 0.1);
    textPlane.rotation.y = 0;
    scene.add(textPlane);
}

export function spawnEnemies(levelData, gameState, createEnemy) {
    // Spawn enemies in the room
    const room = levelData.rooms[0]; // Only one room

    for (let i = 0; i < room.enemies; i++) {
        const enemyType = Math.ceil(Math.random() * 3);

        // Random position within room, but not too close to player start
        const x = (Math.random() - 0.5) * (room.width - 6);
        const z = (Math.random() - 0.5) * (room.height - 6);

        // Make sure enemy isn't right at player spawn
        if (Math.abs(z - (ROOM_SIZE/2 - 2)) > 3) {
            createEnemy(new THREE.Vector3(x, 1.5, z), enemyType);
        }
    }
}
