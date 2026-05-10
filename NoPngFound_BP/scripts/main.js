import { world, system, ItemStack } from "@minecraft/server";

// Calculate a random time between 6000 and 12000 ticks

// List of blocks we want to track
const interactiveBlocks = [
    "minecraft:chest",
    "minecraft:trapped_chest",
    "minecraft:copper_chest",
    "minecraft:exposed_copper_chest",
    "minecraft:weathered_copper_chest",
    "minecraft:oxidized_copper_chest",
    "minecraft:waxed_copper_chest",
    "minecraft:waxed_exposed_copper_chest",
    "minecraft:waxed_weathered_copper_chest",
    "minecraft:waxed_oxidized_copper_chest",
    "minecraft:barrel",
    "minecraft:furnace",
    "minecraft:blast_furnace",
    "minecraft:smoker",
    "minecraft:crafting_table",
    "minecraft:ender_chest",
    "minecraft:brewing_stand",
    "minecraft:hopper",
    "minecraft:dispenser",
    "minecraft:dropper"
];

world.afterEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block } = event;
    const blockId = block.typeId;
    const { dimension, location } = block; // Define these at the top so both checks can see them

    // Handle Utility Blocks (Chest, Furnace, etc.)
    if (interactiveBlocks.includes(blockId)) {
        // Keep your 1.25% random chance for these blocks
        if (Math.random() < 0.0125) {
            try {
                const { x, y, z } = location;
                dimension.runCommand(`setblock ${x} ${y} ${z} air [] destroy`);

                system.runTimeout(() => {
                    const targetBlock = dimension.getBlock(location);
                    if (targetBlock) {
                        targetBlock.setType("no_png:missingtexture_block");
                    }
                }, 2);

                player.playSound("mob.dont_look.hit", player.location);
                world.sendMessage(`§4[ERROR]§r ${player.name} corrupted a ${blockId.split(":")[1].toUpperCase()}`);
            } catch (error) {
                console.warn("Failed to break and glitch block: " + error);
            }
        }
    }
    // Handle Jukebox specifically (100% chance)
    else if (blockId === "minecraft:jukebox") {
        // We need to define equipment and mainHandItem here
        const equipment = player.getComponent("minecraft:equippable");
        const mainHandItem = equipment?.getEquipment("Mainhand");

        if (mainHandItem?.typeId === "no_png:no_texture_disc") {
            try {
                // Change the block to the corrupted version
                block.setType("no_png:missingtexture_block");

                // Spawn the particle effect
                dimension.spawnParticle("no_png:missing_particle", {
                    x: location.x,
                    y: location.y,
                    z: location.z
                });

                // Play the scary sound
                player.playSound("mob.dont_look.hit", player.location);

                // Alert the world
                world.sendMessage(`§4[ERROR]§r ${player.name} inserted a corrupted frequency.`);
            } catch (error) {
                console.warn("Failed to glitch jukebox: " + error);
            }
        } else if (mainHandItem?.typeId === "minecraft:music_disc_11" || mainHandItem?.typeId === "minecraft:music_disc_13") {
            // Handle the 11 disc case
            dimension.spawnParticle("no_png:missing_particle", {
                x: location.x,
                y: location.y,
                z: location.z
            });
        }
    }
});

const randomEvents = [
    function spawnHerobrine() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const player = players[0];
            const herobrinePos = {
                x: player.location.x + (Math.random() * 100 - 50),
                y: player.location.y + 25,
                z: player.location.z + (Math.random() * 100 - 50)
            };
            player.dimension.spawnEntity("no_png:watching_herobrine", herobrinePos);
            world.sendMessage("HEROBRINE SPAWNED!");
        }
    },
    function placeGlitchedBlock() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const player = players[0];
            const blockPos = { x: player.location.x + (Math.random() * 200 - 100), y: player.location.y + (Math.random() * 200 - 100), z: player.location.z + (Math.random() * 200 - 100) };
            player.dimension.getBlock(blockPos)?.setType("no_png:missingtexture_block");
            world.sendMessage("GLITCHED BLOCK SPAWNED!");
        }
    },
    function playScarySound() {
        const players = world.getAllPlayers();
        for (const player of players) {
            player.playSound("mob.dont_look.hit", player.location);
        }
        world.sendMessage("SOUND PLAYED!");
    },
    function placeCross() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const player = players[0];
            const originBlockPos = { x: player.location.x + (Math.random() * 200 - 100), y: player.location.y + (Math.random() * 200 - 100), z: player.location.z + (Math.random() * 200 - 100) };
            const topBlockPos = { x: originBlockPos.x, y: originBlockPos.y + 1, z: originBlockPos.z };
            const sideLeftBlockPos = { x: originBlockPos.x - 1, y: originBlockPos.y, z: originBlockPos.z };
            const sideRightBlockPos = { x: originBlockPos.x + 1, y: originBlockPos.y, z: originBlockPos.z };
            const downBlockPos = { x: originBlockPos.x, y: originBlockPos.y - 1, z: originBlockPos.z };
            const bottomBlockPos = { x: originBlockPos.x, y: originBlockPos.y - 2, z: originBlockPos.z };
            player.dimension.getBlock(originBlockPos)?.setType("no_png:missingtexture_block");
            player.dimension.getBlock(topBlockPos)?.setType("no_png:missingtexture_block");
            player.dimension.getBlock(sideLeftBlockPos)?.setType("no_png:missingtexture_block");
            player.dimension.getBlock(sideRightBlockPos)?.setType("no_png:missingtexture_block");
            player.dimension.getBlock(downBlockPos)?.setType("no_png:missingtexture_block");
            player.dimension.getBlock(bottomBlockPos)?.setType("no_png:missingtexture_block");
            world.sendMessage("GLITCHED CROSS SPAWNED!");
        }
    },
    function spawnFountainItem() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const player = players[0];
            const dimension = player.dimension;

            // Determine total items to spawn (between 16 and 128)
            const totalItems = Math.floor(Math.random() * (64 - 16 + 1)) + 16;
            let itemsSpawned = 0;

            world.sendMessage("A FOUNTAIN OF ITEMS HAS APPEARED!");

            // Run an interval every 2 ticks (0.1 seconds)
            const fountainInterval = system.runInterval(() => {
                if (itemsSpawned >= totalItems) {
                    system.clearRun(fountainInterval);
                    return;
                }

                const spawnPos = {
                    x: player.location.x + (Math.random() * 4 - 2), // Slight random spread
                    y: player.location.y + 1.5,
                    z: player.location.z + (Math.random() * 4 - 2)
                };

                const itemStack = new ItemStack("no_png:no_texture_item", 1);
                dimension.spawnItem(itemStack, spawnPos);

                itemsSpawned++;
            }, 0.1); // 2 ticks = 0.1 seconds
        }
    },
    function spawnSingleItem() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const player = players[0];
            const dimension = player.dimension;

            // Determine total items to spawn (between 16 and 128)
            const totalItems = 1;
            let itemsSpawned = 0;
            const itemChoices = [
                "no_png:no_texture_item",
                "no_png:no_texture_disc",
                "minecraft:music_disc_11",
                "minecraft:music_disc_13",
                "no_png:burnt_out_torch"
            ];

            world.sendMessage("A SINGLE ITEM HAS BEEN GIVEN!");

            // Run an interval every 2 ticks (0.1 seconds)

            if (itemsSpawned >= totalItems) {
                system.clearRun(fountainInterval);
                return;
            }

            const spawnPos = {
                x: player.location.x, // Slight random spread
                y: player.location.y,
                z: player.location.z
            };

            const randomIndex = Math.floor(Math.random() * itemChoices.length);
            const selectedItem = itemChoices[randomIndex];

            // Create the stack with the SINGLE string
            const itemStack = new ItemStack(selectedItem, 1);
            dimension.spawnItem(itemStack, spawnPos);

            itemsSpawned++;
            // 2 ticks = 0.1 seconds
        }
    }
];

function eventDirector() {
    world.sendMessage("Event started/reset!");
    // Wait between 6000 and 12000 ticks (5-10 minutes)
    // Math.floor(Math.random() * 6001) + 6000;
    const nextWait = Math.floor(Math.random() * 6001) + 6000;
    system.runTimeout(() => {
        // Pick and run a random event from our list
        const index = Math.floor(Math.random() * randomEvents.length);
        randomEvents[index]();

        // Loop again to schedule the NEXT random event
        eventDirector();
    }, nextWait);
}

// Start the director when the script loads
eventDirector();

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

            // Check if Herobrine is on a block adjacent to the player (on x or z axis)
            const playerBlockX = Math.floor(player.location.x);
            const playerBlockZ = Math.floor(player.location.z);
            const herobrineBlockX = Math.floor(herobrine.location.x);
            const herobrineBlockZ = Math.floor(herobrine.location.z);
            const isAdjacentHorizontally = (
                (Math.abs(playerBlockX - herobrineBlockX) === 1 && playerBlockZ === herobrineBlockZ) ||
                (Math.abs(playerBlockZ - herobrineBlockZ) === 1 && playerBlockX === herobrineBlockX)
            );

            // If player is more than 2 blocks higher and within horizontal range, jump and place block
            // Only jump if player is NOT in creative mode AND Herobrine is in active state AND is adjacent to player
            if (heightDiff > 1 && horizontalDist < 10 && !playerInCreative && isHerobrineActive && isAdjacentHorizontally) {
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