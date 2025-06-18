import * as THREE from 'three';

// Wall quotes
const wallQuotes = [
    "We're on the high road to anarchy",
    "We're just putting lipstick on a pig. But sometimes what the pig needs is lipstick",
    "I would describe that as criminally optimistic",
    "Every time I hear 'form data' is a stab to my heart",
    "As the system grows, there are more things"
];

export function generateLevel(levelData) {
    // Single fixed-size room
    const roomSize = 30;
    
    levelData.startPos = { x: 0, z: 0 };
    levelData.endPos = { x: 0, z: 0 };
    
    // Just one room
    levelData.room = {
        x: 0,
        z: 0,
        width: roomSize,
        depth: roomSize
    };
    
    console.log('Generated single room level');
}

export function buildLevel(levelData, scene, createWall) {
    const room = levelData.room;
    const halfWidth = room.width / 2;
    const halfDepth = room.depth / 2;
    
    // Create simple room walls
    createWall([room.x - halfWidth, 2, room.z - halfDepth], [room.width, 4, 1], 'brick'); // North
    createWall([room.x - halfWidth, 2, room.z + halfDepth], [room.width, 4, 1], 'brick'); // South
    createWall([room.x - halfWidth, 2, room.z], [1, 4, room.depth], 'brick'); // West
    createWall([room.x + halfWidth, 2, room.z], [1, 4, room.depth], 'brick'); // East
    
    // Add red end marker in a corner
    const endMarker = new THREE.Mesh(
        new THREE.SphereGeometry(2, 16, 16),
        new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0x440000 })
    );
    
    // Position in a random corner
    const corners = [
        { x: room.x - halfWidth + 3, z: room.z - halfDepth + 3 }, // Northwest corner
        { x: room.x + halfWidth - 3, z: room.z - halfDepth + 3 }, // Northeast corner
        { x: room.x - halfWidth + 3, z: room.z + halfDepth - 3 }, // Southwest corner
        { x: room.x + halfWidth - 3, z: room.z + halfDepth - 3 }  // Southeast corner
    ];
    
    const chosenCorner = corners[Math.floor(Math.random() * corners.length)];
    endMarker.position.set(chosenCorner.x, 2, chosenCorner.z);
    scene.add(endMarker);
    
    // Update level end position for completion check
    levelData.endPos = { x: chosenCorner.x, z: chosenCorner.z };
}

export function addWallQuotes(levelData, scene) {
    // Add one random quote to a wall in the single room
    const room = levelData.room;
    const quote = wallQuotes[Math.floor(Math.random() * wallQuotes.length)];
    
    // Create text as a simple plane with canvas texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    
    // Style the text
    context.fillStyle = '#000000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#00ff00';
    context.font = 'bold 20px monospace';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Wrap text if too long
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
    
    // Draw the lines
    const lineHeight = 25;
    const startY = (canvas.height - lines.length * lineHeight) / 2 + lineHeight / 2;
    lines.forEach((line, index) => {
        context.fillText(line, canvas.width / 2, startY + index * lineHeight);
    });
    
    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshLambertMaterial({ map: texture });
    const geometry = new THREE.PlaneGeometry(8, 2);
    const textPlane = new THREE.Mesh(geometry, material);
    
    // Position on a random wall of the room
    const wallSide = Math.floor(Math.random() * 4); // 0=north, 1=east, 2=south, 3=west
    const halfWidth = room.width / 2;
    const halfDepth = room.depth / 2;
    
    let wallX = room.x;
    let wallZ = room.z;
    let rotation = 0;
    
    switch (wallSide) {
        case 0: // North wall
            wallZ -= halfDepth - 0.01;
            rotation = 0;
            break;
        case 1: // East wall
            wallX += halfWidth - 0.01;
            rotation = -Math.PI / 2;
            break;
        case 2: // South wall
            wallZ += halfDepth - 0.01;
            rotation = Math.PI;
            break;
        case 3: // West wall
            wallX -= halfWidth - 0.01;
            rotation = Math.PI / 2;
            break;
    }
    
    textPlane.position.set(wallX, 2.5, wallZ);
    textPlane.rotation.y = rotation;
    scene.add(textPlane);
}

export function spawnEnemies(levelData, gameState, createEnemy) {
    // Scale enemy difficulty by level
    const baseEnemies = 2 + gameState.currentLevel;
    const numEnemies = Math.min(baseEnemies, 8); // Cap at 8 enemies
    
    // Spawn enemies in the single room
    const room = levelData.room;
    
    for (let i = 0; i < numEnemies; i++) {
        const enemyType = Math.ceil(Math.random() * 3);
        
        // Random position within room (avoid center where player spawns)
        const offsetRange = Math.min(room.width, room.depth) / 2 - 3;
        let x, z;
        do {
            x = room.x + (Math.random() - 0.5) * offsetRange * 2;
            z = room.z + (Math.random() - 0.5) * offsetRange * 2;
        } while (Math.sqrt(x * x + z * z) < 5); // Keep away from center
        
        createEnemy(new THREE.Vector3(x, 1.5, z), enemyType);
    }
}