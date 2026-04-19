import { world, system } from "@minecraft/server";

function isAreaAir(dimension, startPos, width, height, depth) {
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            for (let z = 0; z < depth; z++) {
                const block = dimension.getBlock({
                    x: Math.floor(startPos.x + x),
                    y: Math.floor(startPos.y + y),
                    z: Math.floor(startPos.z + z)
                });
                if (!block || block.typeId !== "minecraft:air") {
                    return false;
                }
            }
        }
    }
    return true;
}

// Map the base entities to their "don't look at me" variants
const entitySpawnMap = {
    "no_png:chicken_no_texture": "no_png:dont_look_at_me",
    "no_png:cow_no_texture": "no_png:dont_look_at_me_cow",
    "no_png:pig_no_texture": "no_png:dont_look_at_me_pig",
    "no_png:sheep_no_texture": "no_png:dont_look_at_me_sheep"
};

world.afterEvents.entitySpawn.subscribe((event) => {
    const entity = event.entity;

    // Check if the spawned entity is in our map
    if (entity?.typeId && entitySpawnMap[entity.typeId]) {

        const { dimension, location } = entity;
        const entitySpawn = entitySpawnMap[entity.typeId];

        let spawned = false;
        let attempts = 0;
        const maxAttempts = 25; // Prevent infinite loops

        while (!spawned && attempts < maxAttempts) {
            attempts++;

            if (attempts <= 50) {

                const randomX = location.x + (Math.random() * 80 - 40);
                const randomZ = location.z + (Math.random() * 80 - 40);
                const spawnPos = { x: randomX, y: location.y, z: randomZ };

                // Check for a 3x2x1 pocket of air (3 wide, 2 high)
                if (isAreaAir(dimension, spawnPos, 3, 2, 1)) {
                    try {
                        dimension.spawnEntity(entitySpawn, spawnPos);

                        world.sendMessage("§b[Test]§r A friend has arrived after " + attempts + " attempts.");
                        spawned = true;
                    } catch (error) {
                        console.warn("Failed to spawn entity: " + error);
                    }
                }
            }
        }
    }
});

system.runInterval(() => {
    const dimension = world.getDimension("overworld");

    // Check for all four "don't look at me" variants
    const entities = dimension.getEntities().filter(entity =>
        entity.typeId === "no_png:dont_look_at_me" ||
        entity.typeId === "no_png:dont_look_at_me_cow" ||
        entity.typeId === "no_png:dont_look_at_me_pig" ||
        entity.typeId === "no_png:dont_look_at_me_sheep"
    );

    for (const entity of entities) {
        const { x, y, z } = entity.location;

        // Using Math.floor ensures we target the exact block grid coordinates
        const blockBelow = dimension.getBlock({
            x: Math.floor(x),
            y: Math.floor(y) - 1,
            z: Math.floor(z)
        });

        if (blockBelow && blockBelow.typeId !== "no_png:missingtexture_block" && blockBelow.typeId !== "minecraft:air") {
            try {
                blockBelow.setType("no_png:missingtexture_block");
            } catch (e) {
                // Catches errors if the block is in an unloaded chunk
            }
        }
    }
}, 5);

// Handle Herobrine block placement and jumping when can't reach player
system.runInterval(() => {
    const dimension = world.getDimension("overworld");
    const herobrine = dimension.getEntities().find(entity => entity.typeId === "no_png:active_herobrine");

    if (herobrine) {
        const targetPlayers = dimension.getPlayers().filter(player => {
            const dist = Math.sqrt(
                Math.pow(player.location.x - herobrine.location.x, 2) +
                Math.pow(player.location.y - herobrine.location.y, 2) +
                Math.pow(player.location.z - herobrine.location.z, 2)
            );
            return dist < 64; // Within attack range
        });

        if (targetPlayers.length > 0) {
            const player = targetPlayers[0];
            const heightDiff = player.location.y - herobrine.location.y;
            const horizontalDist = Math.sqrt(
                Math.pow(player.location.x - herobrine.location.x, 2) +
                Math.pow(player.location.z - herobrine.location.z, 2)
            );

            // Check if player is in creative mode and if Herobrine is in active state
            const playerInCreative = player.getGameMode() === "creative";
            const herobineVariant = herobrine.getComponent("minecraft:variant")?.value || 0;
            const isHerobrineActive = herobineVariant === 1;

            // If player is more than 2 blocks higher and within horizontal range, jump and place block
            // Only jump if player is NOT in creative mode AND Herobrine is in active state
            if (heightDiff > 1 && horizontalDist < 10 && !playerInCreative && isHerobrineActive) {
                try {
                    // Jump first
                    herobrine.applyKnockback(0, 0, 0, 0.6);

                    // Then place block under original position
                    const blockBelow = dimension.getBlock({
                        x: Math.floor(herobrine.location.x),
                        y: Math.floor(herobrine.location.y),
                        z: Math.floor(herobrine.location.z)
                    });

                    if (blockBelow && blockBelow.typeId === "minecraft:air") {
                        system.runTimeout(() => {
                            blockBelow.setType("no_png:missingtexture_block");
                        }, 5);

                    }
                } catch (e) {
                    // Catches errors if the block is in an unloaded chunk
                }
            }
        }
    }
}, 10);

// --- UPDATED CODE BELOW ---

// Triggers whenever a player uses an item on a block
world.afterEvents.itemUseOn.subscribe((event) => {
    const item = event.itemStack;
    const block = event.block;

    if (
        item &&
        (item.typeId === "minecraft:flint_and_steel" || item.typeId === "minecraft:fire_charge") &&
        block?.typeId === "minecraft:netherrack"
    ) {
        const mossyPos = { x: block.location.x, y: block.location.y - 1, z: block.location.z };
        const blockBelow = block.dimension.getBlock(mossyPos);

        if (blockBelow?.typeId === "minecraft:mossy_cobblestone") {
            let allGold = true;

            // 1. GOLD RING CHECK
            for (let offsetX = -1; offsetX <= 1; offsetX++) {
                for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
                    if (offsetX === 0 && offsetZ === 0) continue;
                    const blockGold = block.dimension.getBlock({
                        x: mossyPos.x + offsetX,
                        y: mossyPos.y,
                        z: mossyPos.z + offsetZ
                    });
                    if (blockGold?.typeId !== "minecraft:gold_block") {
                        allGold = false;
                        break;
                    }
                }
                if (!allGold) break;
            }

            if (allGold) {
                let allRed = true;

                // 2. REDSTONE TORCH CHECK (Cross Shape)
                for (let redX = -1; redX <= 1; redX++) {
                    for (let redZ = -1; redZ <= 1; redZ++) {
                        if (Math.abs(redX) === Math.abs(redZ)) continue;

                        // FIXED: Added .location here
                        const blockRed = block.dimension.getBlock({
                            x: block.location.x + redX,
                            y: block.location.y,
                            z: block.location.z + redZ
                        });

                        if (blockRed?.typeId !== "minecraft:redstone_torch") {
                            allRed = false;
                            break;
                        }
                    }
                    if (!allRed) break;
                }

                if (allRed) {
                    let allAir = true;

                    // 3. AIR CHECK (Diagonal Corners)
                    for (let airX = -1; airX <= 1; airX++) {
                        for (let airZ = -1; airZ <= 1; airZ++) {
                            // This logic targets the 4 corners
                            if (airX === 0 || airZ === 0) continue;

                            // FIXED: Added .location here
                            const blockAir = block.dimension.getBlock({
                                x: block.location.x + airX,
                                y: block.location.y,
                                z: block.location.z + airZ
                            });

                            if (blockAir?.typeId !== "minecraft:air") {
                                allAir = false;
                                break;
                            }
                        }
                        if (!allAir) break;
                    }

                    if (allAir) {
                        // 1. Trigger the environmental effects
                        block.dimension.spawnEntity("minecraft:lightning_bolt", {
                            x: block.location.x + 0.5,
                            y: block.location.y + 1,
                            z: block.location.z + 0.5
                        });

                        block.dimension.spawnEntity("no_png:active_herobrine", {
                            x: block.location.x + 0.5,
                            y: block.location.y + 2,
                            z: block.location.z + 0.5
                        });

                        // Play the hit sound from dont_look_at_me
                        block.dimension.playSound("mob.dont_look.hit", {
                            x: block.location.x + 0.5,
                            y: block.location.y + 2,
                            z: block.location.z + 0.5
                        });

                        // 2. Change the center block
                        block.setType("no_png:missingtexture_block");

                        // 3. Turn the redstone torches into unlit ones
                        for (let x = -1; x <= 1; x++) {
                            for (let z = -1; z <= 1; z++) {
                                // This uses the same cross-shape logic from your check
                                if (Math.abs(x) === Math.abs(z)) continue;

                                const torchBlock = block.dimension.getBlock({
                                    x: block.location.x + x,
                                    y: block.location.y,
                                    z: block.location.z + z
                                });

                                // Replace the lit torch with the unlit version
                                torchBlock?.setType("minecraft:unlit_redstone_torch");
                                system.runTimeout(() => {
                                    // After 5 seconds, turn it back to a lit torch
                                    torchBlock?.setType("no_png:burnt_out_torch");
                                }, 5);
                            }
                        }


                        // 1. GOLD RING CHECK
                        for (let offsetX = -1; offsetX <= 1; offsetX++) {
                            for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {

                                const missingRandomTime = 5 + Math.floor(Math.random() * 15); // Random time between 5 and 15 seconds


                                const blockGold = block.dimension.getBlock({
                                    x: mossyPos.x + offsetX,
                                    y: mossyPos.y,
                                    z: mossyPos.z + offsetZ
                                });

                                if (Math.random() < 0.5) {
                                    system.runTimeout(() => {
                                        // After 5 seconds, turn it back to a lit torch
                                        blockGold?.setType("no_png:missingtexture_block");
                                    }, missingRandomTime);
                                }
                            }

                        }
                    }
                }
            }
        }
    }
});