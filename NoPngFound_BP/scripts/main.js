import { world, system, ItemStack } from "@minecraft/server";

// --- CONSTANTS ---
const MIN_Y = -64;
const MAX_Y = 319;

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

// Helper to check if Y is within valid world bounds
function isYValid(y) {
    return y >= MIN_Y && y <= MAX_Y;
}

world.afterEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, block } = event;
    const blockId = block.typeId;
    const { dimension, location } = block;

    if (interactiveBlocks.includes(blockId)) {
        if (Math.random() < 0.0125) {
            try {
                const { x, y, z } = location;
                dimension.runCommand(`setblock ${x} ${y} ${z} air [] destroy`);

                system.runTimeout(() => {
                    try {
                        const targetBlock = dimension.getBlock(location);
                        if (targetBlock && isYValid(location.y)) {
                            targetBlock.setType("no_png:missingtexture_block");
                        }
                    } catch (e) { } // Catch unloaded chunk errors
                }, 2);

                player.playSound("mob.dont_look.hit", player.location);
                world.sendMessage(`§4[ERROR]§r ${player.name} corrupted a ${blockId.split(":")[1].toUpperCase()}`);
            } catch (error) {
                console.warn("Failed to break and glitch block: " + error);
            }
        }
    }
    else if (blockId === "minecraft:jukebox") {
        const equipment = player.getComponent("minecraft:equippable");
        const mainHandItem = equipment?.getEquipment("Mainhand");

        if (mainHandItem?.typeId === "no_png:no_texture_disc") {
            try {
                block.setType("no_png:missingtexture_block");
                dimension.spawnParticle("no_png:missing_particle", {
                    x: location.x,
                    y: location.y,
                    z: location.z
                });
                player.playSound("mob.dont_look.hit", player.location);
                if (Math.random() > 0.01) {
                    world.sendMessage(`§k${player.name}§r${player.name}§k${player.name}§r . . . you aren't allowed to hear that . . .`);
                } else {
                    world.sendMessage(`§k${player.name}§r${player.name}§k${player.name}§r . . . you aren't allowed to hear what HE has to say . . . . . .`);
                }
            } catch (error) {
                console.warn("Failed to glitch jukebox: " + error);
            }
        } else if (mainHandItem?.typeId === "minecraft:music_disc_11" || mainHandItem?.typeId === "minecraft:music_disc_13") {
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
            const randomIndex = Math.floor(Math.random() * players.length);
            const player = players[randomIndex];
            const dimension = player.dimension;

            // 1. Check if the "Active" Herobrine already exists
            const activeHerobrines = dimension.getEntities({ type: "no_png:active_herobrine" });
            if (activeHerobrines.length > 0) {
                return false; // Returns false to trigger an instant reroll
            }

            // 2. Remove any old "Watching" Herobrines to prevent duplicates
            const existingWatchers = dimension.getEntities({ type: "no_png:watching_herobrine" });
            for (const entity of existingWatchers) {
                entity.remove();
            }

            // 3. Logic for spawning the new watcher
            const herobrinePos = {
                x: player.location.x + (Math.random() * 100 - 50),
                y: Math.min(MAX_Y, player.location.y + 25),
                z: player.location.z + (Math.random() * 100 - 50)
            };

            try {
                dimension.spawnEntity("no_png:watching_herobrine", herobrinePos);
                world.sendMessage("HEROBRINE SPAWNED!");
            } catch (e) { }
        }
    },
    function placeGlitchedBlock() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const randomIndex = Math.floor(Math.random() * players.length);
            const player = players[randomIndex];
            const blockPos = {
                x: player.location.x + (Math.random() * 64 - 32),
                y: Math.floor(player.location.y + (Math.random() * 64 - 32)),
                z: player.location.z + (Math.random() * 64 - 32)
            };

            if (!isYValid(blockPos.y) || !isYValid(blockPos.y + 6)) {
                world.sendMessage("GLITCH BLOCK EVENT FAILED: Invalid Y coordinate generated (" + blockPos.y + "). This event will be skipped to prevent crashes.");
                return;
            }

            try {
                const glitchBlock = player.dimension.getBlock(blockPos);
                if (!glitchBlock) return;

                if (glitchBlock.typeId !== "minecraft:grass_block") {
                    if (Math.random() < 0.5) {
                        glitchBlock.setType("minecraft:oak_sign");
                        world.sendMessage("A GLITCHED SIGN HAS APPEARED!");
                    } else {
                        glitchBlock.setType("no_png:missingtexture_block");
                        world.sendMessage("A GLITCHED BLOCK HAS APPEARED!");
                    }
                } else {
                    for (let trunkY = blockPos.y + 1; trunkY <= blockPos.y + 6; trunkY++) {
                        player.dimension.getBlock({ x: blockPos.x, y: trunkY, z: blockPos.z })?.setType("no_png:missingtexture_block");

                        if (trunkY === blockPos.y + 6) {
                            // --- Lower Foliage Layers ---
                            for (let leafX = -2; leafX <= 2; leafX++) {
                                for (let leafZ = -2; leafZ <= 2; leafZ++) {
                                    for (let leafY = trunkY - 3; leafY <= trunkY - 2; leafY++) {
                                        if (!isYValid(leafY)) continue;

                                        const isCorner = Math.abs(leafX) === 2 && Math.abs(leafZ) === 2;

                                        if (isCorner) {
                                            if (Math.random() < 0.4) {
                                                player.dimension.getBlock({ x: blockPos.x + leafX, y: leafY, z: blockPos.z + leafZ })?.setType("no_png:missingtexture_block");
                                            }
                                        } else {
                                            player.dimension.getBlock({ x: blockPos.x + leafX, y: leafY, z: blockPos.z + leafZ })?.setType("no_png:missingtexture_block");
                                        }

                                        // --- Upper Foliage Layers ---
                                        if (leafX === 2 && leafY === trunkY - 2 && leafZ === 2) {
                                            for (let leafX2 = -1; leafX2 <= 1; leafX2++) {
                                                for (let leafZ2 = -1; leafZ2 <= 1; leafZ2++) {
                                                    for (let leafY2 = trunkY - 1; leafY2 <= trunkY; leafY2++) {
                                                        if (!isYValid(leafY2)) continue;

                                                        const isTopCorner = Math.abs(leafX2) === 1 && Math.abs(leafZ2) === 1;

                                                        if (isTopCorner) {
                                                            if (Math.random() < 0.33) {
                                                                player.dimension.getBlock({ x: blockPos.x + leafX2, y: leafY2, z: blockPos.z + leafZ2 })?.setType("no_png:missingtexture_block");
                                                            }
                                                        } else {
                                                            player.dimension.getBlock({ x: blockPos.x + leafX2, y: leafY2, z: blockPos.z + leafZ2 })?.setType("no_png:missingtexture_block");
                                                        }

                                                        if (leafX2 === 1 && leafY2 === trunkY && leafZ2 === 1) {
                                                            world.sendMessage("GLITCHED TREE SPAWNED!");
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                // Ignore if chunk is unloaded
            }
        }
    },
    function playScarySound() {
        // Kept as a global event so all players hear it
        const players = world.getAllPlayers();
        for (const player of players) {
            player.playSound("mob.dont_look.hit", player.location);
        }
        world.sendMessage("SOUND PLAYED!");
    },
    function placeCross() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const randomIndex = Math.floor(Math.random() * players.length);
            const player = players[randomIndex];
            const originBlockPos = {
                x: player.location.x + (Math.random() * 200 - 100),
                y: Math.floor(player.location.y + (Math.random() * 100)),
                z: player.location.z + (Math.random() * 200 - 100)
            };

            if (!isYValid(originBlockPos.y - 2) || !isYValid(originBlockPos.y + 1)) return;

            const topBlockPos = { x: originBlockPos.x, y: originBlockPos.y + 1, z: originBlockPos.z };
            const sideLeftBlockPos = { x: originBlockPos.x - 1, y: originBlockPos.y, z: originBlockPos.z };
            const sideRightBlockPos = { x: originBlockPos.x + 1, y: originBlockPos.y, z: originBlockPos.z };
            const downBlockPos = { x: originBlockPos.x, y: originBlockPos.y - 1, z: originBlockPos.z };
            const bottomBlockPos = { x: originBlockPos.x, y: originBlockPos.y - 2, z: originBlockPos.z };

            try {
                player.dimension.getBlock(originBlockPos)?.setType("no_png:missingtexture_block");
                player.dimension.getBlock(topBlockPos)?.setType("no_png:missingtexture_block");
                player.dimension.getBlock(sideLeftBlockPos)?.setType("no_png:missingtexture_block");
                player.dimension.getBlock(sideRightBlockPos)?.setType("no_png:missingtexture_block");
                player.dimension.getBlock(downBlockPos)?.setType("no_png:missingtexture_block");
                player.dimension.getBlock(bottomBlockPos)?.setType("no_png:missingtexture_block");
                world.sendMessage("GLITCHED CROSS SPAWNED!");
            } catch (e) { } // Ignore if chunk is unloaded
        }
    },
    function spawnFountainItem() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const randomIndex = Math.floor(Math.random() * players.length);
            const player = players[randomIndex];
            const dimension = player.dimension;
            const totalItems = Math.floor(Math.random() * (64 - 16 + 1)) + 16;
            let itemsSpawned = 0;

            world.sendMessage("A FOUNTAIN OF ITEMS HAS APPEARED!");

            const fountainInterval = system.runInterval(() => {
                if (itemsSpawned >= totalItems) {
                    system.clearRun(fountainInterval);
                    return;
                }

                const spawnPos = {
                    x: player.location.x + (Math.random() * 4 - 2),
                    y: player.location.y + 1.5,
                    z: player.location.z + (Math.random() * 4 - 2)
                };

                try {
                    const itemStack = new ItemStack("no_png:no_texture_item", 1);
                    dimension.spawnItem(itemStack, spawnPos);
                    itemsSpawned++;
                } catch (e) { }
            }, 1);
        }
    },
    function spawnSingleItem() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const randomIndex = Math.floor(Math.random() * players.length);
            const player = players[randomIndex];
            const dimension = player.dimension;
            const itemChoices = [
                "no_png:no_texture_item",
                "no_png:no_texture_disc",
                "minecraft:music_disc_11",
                "minecraft:music_disc_13"
            ];

            world.sendMessage("A SINGLE ITEM HAS BEEN GIVEN!");
            const spawnPos = { x: player.location.x, y: player.location.y, z: player.location.z };
            const itemIndex = Math.floor(Math.random() * itemChoices.length);
            const selectedItem = itemChoices[itemIndex];

            try {
                const itemStack = new ItemStack(selectedItem, 1);
                dimension.spawnItem(itemStack, spawnPos);
            } catch (e) { }
        }
    },
    function corruptChunk() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const randomIndex = Math.floor(Math.random() * players.length);
            const player = players[randomIndex];
            const dimension = player.dimension;
            const py = Math.floor(player.location.y);

            const startY = Math.max(MIN_Y + 1, py - 10);
            const endY = Math.min(MAX_Y, py + 10);
            let chunkCorrupted = false;

            for (let chunkY = startY; chunkY <= endY; chunkY++) {
                for (let chunkX = -7; chunkX <= 8; chunkX++) {
                    for (let chunkZ = -7; chunkZ <= 8; chunkZ++) {
                        try {
                            const chunk = dimension.getBlock({ x: Math.floor(player.location.x) + chunkX, y: chunkY, z: Math.floor(player.location.z) + chunkZ });

                            if (chunk && chunk.typeId !== "minecraft:air" && chunk.typeId !== "no_png:missingtexture_block") {
                                if (Math.random() < 0.1) {
                                    chunk.setType("no_png:missingtexture_block");
                                    chunkCorrupted = true;
                                }
                            }
                        } catch (e) { }
                    }
                }
            }
            if (chunkCorrupted) {
                world.sendMessage("A CHUNK HAS BEEN CORRUPTED!");
            }
        }
    },
    function breakDoor() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const randomIndex = Math.floor(Math.random() * players.length);
            const player = players[randomIndex];
            const dimension = player.dimension;
            const py = Math.floor(player.location.y);
            const px = Math.floor(player.location.x);
            const pz = Math.floor(player.location.z);

            const startY = Math.max(MIN_Y + 1, py - 7);
            const endY = Math.min(MAX_Y, py + 8);
            let doorBroken = false;

            for (let chunkY = startY; chunkY <= endY; chunkY++) {
                for (let chunkX = -7; chunkX <= 8; chunkX++) {
                    for (let chunkZ = -7; chunkZ <= 8; chunkZ++) {
                        try {
                            const chunk = dimension.getBlock({ x: px + chunkX, y: chunkY, z: pz + chunkZ });

                            if (chunk && chunk.typeId.endsWith("_door")) {
                                const { x, y, z } = chunk.location;
                                dimension.runCommand(`setblock ${x} ${y} ${z} air [] destroy`);
                                doorBroken = true;
                            }
                        } catch (e) { }
                    }
                }
            }
            if (doorBroken) {
                world.sendMessage("All doors in the chunk have been broken!");
            }
        }
    },
    function spawnPlayerEntity() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const randomIndex = Math.floor(Math.random() * players.length);
            const player = players[randomIndex];
            const dimension = player.dimension;
            const spawnPos = {
                x: player.location.x,
                y: player.location.y + 0.5,
                z: player.location.z
            };

            const activePlayerEntities = dimension.getEntities({ type: "no_png:active_herobrine" });
            if (activePlayerEntities.length > 0) {
                return false; // Returns false to trigger an instant reroll
            }

            try {
                // Catch the spawned entity in a variable
                const newPlayerEntity = dimension.spawnEntity("no_png:player_entity", spawnPos);

                // Assign the nametag right as it spawns
                if (newPlayerEntity) {
                    newPlayerEntity.nameTag = "D3rh3nter3";
                }

                world.sendMessage("PLAYER ENTITY SPAWNED!");
            } catch (e) { }
        }
    }
];

function eventDirector() {
    world.sendMessage("Event started/reset!");
    const nextWait = Math.floor(Math.random() * 100) + 100;

    system.runTimeout(() => {
        try {
            let eventSucceeded = false;
            let attempts = 0;

            // Reroll up to 10 times if an event returns false
            while (!eventSucceeded && attempts < 10) {
                attempts++;
                const index = Math.floor(Math.random() * randomEvents.length);

                // Run the event. If it doesn't explicitly return false, mark it as successful
                if (randomEvents[index]() !== false) {
                    eventSucceeded = true;
                }
            }
        } catch (error) {
            console.warn("Event crashed safely: " + error);
        } finally {
            eventDirector();
        }
    }, nextWait);
}

eventDirector();

function isAreaAir(dimension, startPos, width, height, depth) {
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            for (let z = 0; z < depth; z++) {
                const checkY = Math.floor(startPos.y + y);
                if (!isYValid(checkY)) return false;

                try {
                    const block = dimension.getBlock({
                        x: Math.floor(startPos.x + x),
                        y: checkY,
                        z: Math.floor(startPos.z + z)
                    });
                    if (!block || block.typeId !== "minecraft:air") {
                        return false;
                    }
                } catch (e) { return false; }
            }
        }
    }
    return true;
}

const entitySpawnMap = {
    "no_png:chicken_no_texture": "no_png:dont_look_at_me",
    "no_png:cow_no_texture": "no_png:dont_look_at_me_cow",
    "no_png:pig_no_texture": "no_png:dont_look_at_me_pig",
    "no_png:sheep_no_texture": "no_png:dont_look_at_me_sheep"
};

world.afterEvents.entitySpawn.subscribe((event) => {
    const entity = event.entity;
    if (entity?.typeId && entitySpawnMap[entity.typeId]) {
        const { dimension, location } = entity;
        const entitySpawn = entitySpawnMap[entity.typeId];
        let spawned = false;
        let attempts = 0;
        const maxAttempts = 25;

        while (!spawned && attempts < maxAttempts) {
            attempts++;
            const randomX = location.x + (Math.random() * 80 - 40);
            const randomZ = location.z + (Math.random() * 80 - 40);
            const spawnPos = { x: randomX, y: location.y, z: randomZ };

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
});

system.runInterval(() => {
    const dimension = world.getDimension("overworld");
    const entities = dimension.getEntities().filter(entity =>
        entity.typeId === "no_png:dont_look_at_me" ||
        entity.typeId === "no_png:dont_look_at_me_cow" ||
        entity.typeId === "no_png:dont_look_at_me_pig" ||
        entity.typeId === "no_png:dont_look_at_me_sheep"
    );

    for (const entity of entities) {
        const { x, y, z } = entity.location;
        const targetY = Math.floor(y) - 1;

        if (isYValid(targetY)) {
            try {
                const blockBelow = dimension.getBlock({ x: Math.floor(x), y: targetY, z: Math.floor(z) });
                if (blockBelow && blockBelow.typeId !== "no_png:missingtexture_block" && blockBelow.typeId !== "minecraft:air") {
                    blockBelow.setType("no_png:missingtexture_block");
                }
            } catch (e) { }
        }
    }
}, 5);

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
            return dist < 64;
        });

        if (targetPlayers.length > 0) {
            const player = targetPlayers[0];
            const heightDiff = player.location.y - herobrine.location.y;
            const horizontalDist = Math.sqrt(
                Math.pow(player.location.x - herobrine.location.x, 2) +
                Math.pow(player.location.z - herobrine.location.z, 2)
            );

            const playerInCreative = player.getGameMode() === "creative";
            const herobineVariant = herobrine.getComponent("minecraft:variant")?.value || 0;
            const isHerobrineActive = herobineVariant === 1;

            const playerBlockX = Math.floor(player.location.x);
            const playerBlockZ = Math.floor(player.location.z);
            const herobrineBlockX = Math.floor(herobrine.location.x);
            const herobrineBlockZ = Math.floor(herobrine.location.z);
            const isAdjacentHorizontally = (
                (Math.abs(playerBlockX - herobrineBlockX) === 1 && playerBlockZ === herobrineBlockZ) ||
                (Math.abs(playerBlockZ - herobrineBlockZ) === 1 && playerBlockX === herobrineBlockX)
            );

            if (heightDiff > 1 && horizontalDist < 10 && !playerInCreative && isHerobrineActive && isAdjacentHorizontally) {
                try {
                    herobrine.applyKnockback(0, 0, 0, 0.6);
                    const blockPos = {
                        x: Math.floor(herobrine.location.x),
                        y: Math.floor(herobrine.location.y),
                        z: Math.floor(herobrine.location.z)
                    };

                    if (isYValid(blockPos.y)) {
                        const blockBelow = dimension.getBlock(blockPos);
                        if (blockBelow && blockBelow.typeId === "minecraft:air") {
                            system.runTimeout(() => {
                                try {
                                    blockBelow.setType("no_png:missingtexture_block");
                                } catch (e) { }
                            }, 5);
                        }
                    }
                } catch (e) { }
            }
        }
    }
}, 10);

world.afterEvents.itemUseOn.subscribe((event) => {
    const item = event.itemStack;
    const block = event.block;

    if (
        item &&
        (item.typeId === "minecraft:flint_and_steel" || item.typeId === "minecraft:fire_charge") &&
        block?.typeId === "minecraft:netherrack"
    ) {
        const mossyPos = { x: block.location.x, y: block.location.y - 1, z: block.location.z };
        if (!isYValid(mossyPos.y)) return;

        try {
            const blockBelow = block.dimension.getBlock(mossyPos);
            if (blockBelow?.typeId === "minecraft:mossy_cobblestone") {
                let allGold = true;
                for (let offsetX = -1; offsetX <= 1; offsetX++) {
                    for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
                        if (offsetX === 0 && offsetZ === 0) continue;
                        const blockGold = block.dimension.getBlock({ x: mossyPos.x + offsetX, y: mossyPos.y, z: mossyPos.z + offsetZ });
                        if (blockGold?.typeId !== "minecraft:gold_block") { allGold = false; break; }
                    }
                    if (!allGold) break;
                }

                if (allGold) {
                    let allRed = true;
                    for (let redX = -1; redX <= 1; redX++) {
                        for (let redZ = -1; redZ <= 1; redZ++) {
                            if (Math.abs(redX) === Math.abs(redZ)) continue;
                            const blockRed = block.dimension.getBlock({ x: block.location.x + redX, y: block.location.y, z: block.location.z + redZ });
                            if (blockRed?.typeId !== "minecraft:redstone_torch") { allRed = false; break; }
                        }
                        if (!allRed) break;
                    }

                    if (allRed) {
                        let allAir = true;
                        for (let airX = -1; airX <= 1; airX++) {
                            for (let airZ = -1; airZ <= 1; airZ++) {
                                if (airX === 0 || airZ === 0) continue;
                                const blockAir = block.dimension.getBlock({ x: block.location.x + airX, y: block.location.y, z: block.location.z + airZ });
                                if (blockAir?.typeId !== "minecraft:air") { allAir = false; break; }
                            }
                            if (!allAir) break;
                        }

                        if (allAir) {
                            block.dimension.spawnEntity("minecraft:lightning_bolt", { x: block.location.x + 0.5, y: block.location.y + 1, z: block.location.z + 0.5 });
                            block.dimension.spawnEntity("no_png:active_herobrine", { x: block.location.x + 0.5, y: block.location.y + 2, z: block.location.z + 0.5 });
                            block.dimension.playSound("mob.dont_look.hit", { x: block.location.x + 0.5, y: block.location.y + 2, z: block.location.z + 0.5 });
                            block.setType("no_png:missingtexture_block");

                            for (let x = -1; x <= 1; x++) {
                                for (let z = -1; z <= 1; z++) {
                                    if (Math.abs(x) === Math.abs(z)) continue;
                                    const torchBlock = block.dimension.getBlock({ x: block.location.x + x, y: block.location.y, z: block.location.z + z });
                                    torchBlock?.setType("minecraft:unlit_redstone_torch");
                                    system.runTimeout(() => {
                                        try {
                                            torchBlock?.setType("no_png:burnt_out_torch");
                                        } catch (e) { }
                                    }, 100);
                                }
                            }

                            for (let offsetX = -1; offsetX <= 1; offsetX++) {
                                for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
                                    const missingRandomTime = 100 + Math.floor(Math.random() * 200);
                                    const blockGold = block.dimension.getBlock({ x: mossyPos.x + offsetX, y: mossyPos.y, z: mossyPos.z + offsetZ });
                                    if (Math.random() < 0.5) {
                                        system.runTimeout(() => {
                                            try {
                                                blockGold?.setType("no_png:missingtexture_block");
                                            } catch (e) { }
                                        }, missingRandomTime);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) { }
    }
});

world.afterEvents.entityDie.subscribe((event) => {
    const { deadEntity, damageSource } = event;

    // Check if the entity that died is one of your custom mobs
    // Replace "no_png:active_herobrine" with whatever mob you want to track
    if (deadEntity.typeId === "no_png:player_entity") {

        // Check if the killer was a player
        const killer = damageSource?.damagingEntity;

        if (killer && killer.typeId === "minecraft:player") {
            // Send the death message to chat: "Player was slain by Herobrine" (or vice versa)
            world.sendMessage(`${deadEntity.nameTag} was slain by ${killer.name}`);
        }
    }
});