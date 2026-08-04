// --- CONFIGURATION TOGGLES ---
const test = true; // Set to true to show debug/test chat messages, false to mute them
const events = false; // Set to false to disable random events and glitching

const MIN_Y = -64;
const MAX_Y = 319;

const THE_GARDEN_ID = "no_png:the_garden";
const SKY_BLOCK_ID = "no_png:sky_block";
const MINESHAFT_ID = "no_png:mineshaft";

import {
    world,
    system,
    EquipmentSlot,
    ItemStack,
    Player,
    BlockPermutation,
    BlockVolume,
    CustomCommandStatus,
    CommandPermissionLevel
} from "@minecraft/server";

import { ActionFormData } from "@minecraft/server-ui";

// Helper function to handle conditional test logs
function sendTestMessage(message) {
    if (test) {
        world.sendMessage(message);
    }
}

// Subscribe to the event that fires AFTER a block is placed
// Subscribe to the event that fires AFTER a block is placed
world.afterEvents.playerPlaceBlock.subscribe((eventData) => {
    const { player, block } = eventData;

    // Check configuration toggle for glitch/sound events
    if (events) {
        const dimension = block.dimension;
        const blockLocation = block.location;
        const xdirection = Math.abs(blockLocation.x) - Math.abs(player.location.x);
        const roundUpX = Math.ceil(xdirection);
        const zdirection = Math.abs(blockLocation.z) - Math.abs(player.location.z);
        const roundUpZ = Math.ceil(zdirection);

        const soundMultiplier = 1.0; // Adjust this value to change the sound volume
        const soundLocation = { x: player.location.x + (- roundUpX * soundMultiplier), y: blockLocation.y, z: player.location.z + (- roundUpZ * soundMultiplier) };

        if (Math.random() < 0.005) {
            player.playSound("use.stone", { location: soundLocation.location });
        } else if (Math.random() < 0.001) {
            // FIXED: Actually get the block in the world at those coordinates first
            const targetBlock = dimension.getBlock(soundLocation);
            if (targetBlock) {
                targetBlock.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
            }
        }
    }

    // Check if the placed block matches a specific type (e.g., Diamond Block)
    // ALWAYS RUNS: This is excluded from the events toggle
    if (block.typeId === "no_png:glitch_rose_bush") {
        const blockTop = player.dimension.getBlock({ x: block.location.x, y: block.location.y + 1, z: block.location.z });
        if (blockTop && blockTop.typeId === "minecraft:air") {
            blockTop.setPermutation(BlockPermutation.resolve("no_png:glitch_rose_bush_top"));
        } else {
            block.setPermutation(BlockPermutation.resolve("minecraft:air"));
            player.dimension.spawnItem(new ItemStack("no_png:glitch_rose_bush", 1), player.location);
        }
    }
});

world.afterEvents.playerBreakBlock.subscribe((eventData) => {
    const { player, block, brokenBlockPermutation } = eventData;
    const dimension = block.dimension;
    const blockLocation = block.location;

    // Check configuration toggle for glitch/sound events
    if (events) {
        const xdirection = Math.abs(blockLocation.x) - Math.abs(player.location.x);
        const roundUpX = Math.ceil(xdirection);
        const zdirection = Math.abs(blockLocation.z) - Math.abs(player.location.z);
        const roundUpZ = Math.ceil(zdirection);

        const soundMultiplier = 1.0; // Adjust this value to change the sound volume
        const soundLocation = { x: player.location.x + (- roundUpX * soundMultiplier), y: blockLocation.y, z: player.location.z + (- roundUpZ * soundMultiplier) };

        if (Math.random() < 0.005) {
            player.playSound("dig.stone", { location: soundLocation.location });
        } else if (Math.random() < 0.001) {
            // FIXED: Actually get the block in the world at those coordinates first
            const targetBlock = dimension.getBlock(soundLocation);
            if (targetBlock) {
                targetBlock.setPermutation(BlockPermutation.resolve("minecraft:air"));
                player.playSound("dig.stone", { location: soundLocation.location });
            }
        }
    }

    // Check if the broken block is the top part
    // ALWAYS RUNS: This is excluded from the events toggle
    if (brokenBlockPermutation.type.id === "no_png:glitch_rose_bush_top") {

        // 1. Clear the bottom block
        const bottomBlockLocation = { x: blockLocation.x, y: blockLocation.y - 1, z: blockLocation.z };
        const bottomBlock = dimension.getBlock(bottomBlockLocation);
        if (bottomBlock && bottomBlock.typeId === "no_png:glitch_rose_bush") {
            bottomBlock.setPermutation(BlockPermutation.resolve("minecraft:air"));
        }

        // 2. Silk Touch Check
        let hasSilkTouch = false;
        const equippable = player.getComponent("minecraft:equippable");
        const toolInHand = equippable ? equippable.getEquipment(EquipmentSlot.Mainhand) : null;

        if (toolInHand) {
            const enchantable = toolInHand.getComponent("minecraft:enchantable");
            if (enchantable && enchantable.hasEnchantment("minecraft:silk_touch")) {
                hasSilkTouch = true;
            }
        }

        // 3. Handle Spawning and Cleanup
        if (hasSilkTouch) {
            system.run(() => {
                // Remove the "top" block item if it dropped automatically
                const itemEntities = dimension.getEntities({
                    location: blockLocation,
                    maxDistance: 2,
                    type: "minecraft:item"
                });

                for (const entity of itemEntities) {
                    const itemComponent = entity.getComponent("item");
                    // If the game dropped the 'top' block as an item, kill it
                    if (itemComponent && itemComponent.itemStack.typeId === "no_png:glitch_rose_bush_top") {
                        entity.kill();
                    }
                }

                // Spawn the correct item
                dimension.spawnItem(new ItemStack("no_png:glitch_rose_bush", 1), blockLocation);
            });
        }
    }
});

// --- ITEM USE TELEPORT ---
world.afterEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;

    if (itemStack.typeId === "no_png:overworld_compass") {

        // Prevent usage if the player is already in the Overworld
        if (player.dimension.id === "minecraft:overworld") {
            return;
        }

        const overworld = world.getDimension("minecraft:overworld");

        // Get the player's personal spawn point
        const spawnData = player.getSpawnPoint();
        let targetLocation;

        // Check if they have a valid spawn point specifically in the Overworld
        if (spawnData && spawnData.dimension.id === "minecraft:overworld") {
            targetLocation = { x: spawnData.x, y: MAX_Y, z: spawnData.z };
        } else {
            // FIX: Pull the safe fallback spawn from your DIMENSIONS array
            // to avoid the 32767 height bug from getDefaultSpawnLocation()
            targetLocation = { x: 0, y: MAX_Y, z: 0 };
        }

        // Safely run the item deletion and teleport on the next tick
        system.run(() => {
            // 1. Consume the item from the player's main hand
            const equipment = player.getComponent("minecraft:equippable");
            if (equipment) {
                const mainHandSlot = equipment.getEquipmentSlot("Mainhand");

                // Verify the compass is still in their hand
                if (mainHandSlot.hasItem() && mainHandSlot.typeId === "no_png:overworld_compass") {
                    if (mainHandSlot.amount > 1) {
                        mainHandSlot.amount -= 1; // Decrease stack size if they have multiple
                    } else {
                        mainHandSlot.setItem(undefined); // Clear slot if they only have one
                    }
                }
            }

            // 3. Apply Slow Falling for 10 seconds (200 ticks)
            player.addEffect("minecraft:slow_falling", 1200, { amplifier: 0, showParticles: false });

            // 2. Teleport the player
            player.teleport(targetLocation, {
                dimension: overworld
            });
        });
    }
});

// --- MOB DAMAGE TO DIMENSION TELEPORT ---
world.afterEvents.entityHurt.subscribe((event) => {
    const { hurtEntity, damageSource } = event;

    // Check if the damaged entity is a player
    if (hurtEntity instanceof Player) {
        const attacker = damageSource.damagingEntity;

        // Check if the attacker exists and is the specific mob type
        if (attacker && attacker.typeId === "no_png:corruption") {

            // 1. PLAY ABSORB PARTICLE/SOUND AT CURRENT LOCATION
            hurtEntity.dimension.spawnParticle("no_png:missing_particle_absorb", hurtEntity.location);
            // hurtEntity.playSound("no_png:missing_particle_absorb"); // Uncomment if it's a sound

            const targetDimension = [THE_GARDEN_ID, SKY_BLOCK_ID, MINESHAFT_ID];
            // Minor fix: targetDimension.length is cleaner than Object.keys(targetDimension).length
            const randomDimension = targetDimension[Math.floor(Math.random() * targetDimension.length)];
            const skyBlockDestination = DIMENSIONS.find(d => d.id === randomDimension);

            if (skyBlockDestination) {
                // Use your existing teleport logic
                teleportToCustomDimension(hurtEntity, skyBlockDestination);
            }
        }
    }
});

// --- GLITCH & HEROBRINE CONSTANTS ---

const interactiveBlocks = [
    "minecraft:chest", "minecraft:trapped_chest", "minecraft:copper_chest", "minecraft:exposed_copper_chest",
    "minecraft:weathered_copper_chest", "minecraft:oxidized_copper_chest", "minecraft:waxed_copper_chest",
    "minecraft:waxed_exposed_copper_chest", "minecraft:waxed_weathered_copper_chest", "minecraft:waxed_oxidized_copper_chest",
    "minecraft:barrel", "minecraft:furnace", "minecraft:blast_furnace", "minecraft:smoker", "minecraft:crafting_table",
    "minecraft:ender_chest", "minecraft:brewing_stand", "minecraft:hopper", "minecraft:dispenser", "minecraft:dropper"
];

// --- DIMENSION & UI CONSTANTS ---
const Color = {
    red: "\xA7c", aqua: "\xA7b", green: "\xA7a", darkRed: "\xA74", purple: "\xA75",
    yellow: "\xA7e", gray: "\xA77", darkGray: "\xA78", bold: "\xA7l", reset: "\xA7r",
    pink: "\xA7d"
}; 1

const PLATFORMS = [
    { dimensionId: THE_GARDEN_ID, blockId: "no_png:missingtexture_block", radius: 32, center: { x: 0, y: 64, z: 0 } },
    {
        dimensionId: SKY_BLOCK_ID,
        blockId: "no_png:missingtexture_block",
        radius: 5, // Increased to ensure the ticking area covers the new L-shape
        size: { x: 3, y: 3, z: 6 },
        center: { x: 0, y: 62, z: 0 },
        extensions: [
            {
                // This offsets the center of the new box 3 blocks to the side (positive X)
                offset: { x: 3, y: 0, z: 1 },
                // A 3x3x3 box
                size: { x: 3, y: 3, z: 3 }
            }
        ]
    },
    { dimensionId: MINESHAFT_ID, blockId: "minecraft:stone", radius: 1, center: { x: 0, y: 0, z: 0 } }
];

var DIMENSIONS = [
    { label: `${Color.pink}The Garden ${Color.darkGray}(Garden of Glitch Trees)${Color.reset}`, id: THE_GARDEN_ID, spawn: { x: 0, y: 66, z: 0 } },
    { label: `${Color.pink}Sky Block ${Color.darkGray}(Glitch Sky Block)${Color.reset}`, id: SKY_BLOCK_ID, spawn: { x: 0, y: 65, z: -1 } },
    { label: `${Color.pink}Mineshafts ${Color.darkGray}(A sprawling mineshaft)${Color.reset}`, id: MINESHAFT_ID, spawn: { x: 0, y: 0, z: 0 } },
    { label: `${Color.green}Overworld${Color.reset}`, id: "minecraft:overworld", spawn: { x: 0, y: 64, z: 0 } },
    { label: `${Color.darkRed}The Nether${Color.reset}`, id: "minecraft:nether", spawn: { x: 0, y: 64, z: 0 } },
    { label: `${Color.purple}The End${Color.reset}`, id: "minecraft:the_end", spawn: { x: 0, y: 64, z: 0 } },
];

const builtDimensions = new Set();

// --- STARTUP & WORLD LOAD EVENTS ---
system.beforeEvents.startup.subscribe((event) => {
    event.dimensionRegistry.registerCustomDimension(THE_GARDEN_ID);
    event.dimensionRegistry.registerCustomDimension(SKY_BLOCK_ID);
    event.dimensionRegistry.registerCustomDimension(MINESHAFT_ID);

    event.customCommandRegistry.registerCommand(
        {
            name: "no_png:dimensions",
            description: "Open the dimension travel menu",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: true,
        },
        (origin) => {
            const player = origin.sourceEntity;
            if (!player || !(player instanceof Player)) {
                return {
                    status: CustomCommandStatus.Failure,
                    message: "This command can only be used by a player.",
                };
            }

            system.run(() => showDimensionMenu(player));
            return { status: CustomCommandStatus.Success };
        }
    );
});

world.afterEvents.worldLoad.subscribe(() => {


    // START EVENT DIRECTOR AFTER WORLD IS LOADED
    eventDirector();
});

// --- HELPER FUNCTIONS ---
function isYValid(y) {
    return y >= MIN_Y && y <= MAX_Y;
}

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
                    if (!block || block.typeId !== "minecraft:air") return false;
                } catch (e) { return false; }
            }
        }
    }
    return true;
}

// --- GLITCH & SCARY MECHANICS ---
world.afterEvents.playerInteractWithBlock.subscribe((event) => {

    if (!events) return;

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
                            targetBlock.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                        }
                    } catch (e) { }
                }, 2);

                player.playSound("mob.dont_look.hit", { location: player.location });
            } catch (error) {
                console.warn("Failed to break and glitch block: " + error);
            }
        }
    } else if (blockId === "minecraft:jukebox") {
        const equipment = player.getComponent("minecraft:equippable");
        const mainHandItem = equipment?.getEquipment("Mainhand");

        if (mainHandItem?.typeId === "no_png:no_texture_disc") {
            try {
                block.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                dimension.spawnParticle("no_png:missing_particle", location);
                player.playSound("mob.dont_look.hit", { location: player.location });
            } catch (error) {
                console.warn("Failed to glitch jukebox: " + error);
            }
        } else if (mainHandItem?.typeId === "minecraft:music_disc_11" || mainHandItem?.typeId === "minecraft:music_disc_13") {
            dimension.spawnParticle("no_png:missing_particle", location);
        }
    }
});

const randomEvents = [
    function spawnCorruption() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const player = players[Math.floor(Math.random() * players.length)];
            const dimension = player.dimension;

            if (dimension.getEntities({ type: "no_png:corruption" }).length > 0) return false;

            const corruptionPos = {
                x: player.location.x + (Math.random() * 100 - 50),
                y: MAX_Y,
                z: player.location.z + (Math.random() * 100 - 50)
            };

            try {
                dimension.spawnEntity("no_png:corruption", corruptionPos);
                sendTestMessage("CORRUPTION SPAWNED!");
            } catch (e) { }
        }
    },
    function spawnHerobrine() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const player = players[Math.floor(Math.random() * players.length)];
            const dimension = player.dimension;

            if (dimension.getEntities({ type: "no_png:active_herobrine" }).length > 0) return false;

            for (const entity of dimension.getEntities({ type: "no_png:watching_herobrine" })) {
                entity.remove();
            }

            const herobrinePos = {
                x: player.location.x + (Math.random() * 100 - 50),
                y: Math.min(MAX_Y, player.location.y + 25),
                z: player.location.z + (Math.random() * 100 - 50)
            };

            try {
                dimension.spawnEntity("no_png:watching_herobrine", herobrinePos);
                sendTestMessage("HEROBRINE SPAWNED!");
            } catch (e) { }
        }
    },
    function placeGlitchedBlock() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const player = players[Math.floor(Math.random() * players.length)];
            const blockPos = {
                x: player.location.x + (Math.random() * 64 - 32),
                y: Math.floor(player.location.y + (Math.random() * 64 - 32)),
                z: player.location.z + (Math.random() * 64 - 32)
            };

            if (!isYValid(blockPos.y) || !isYValid(blockPos.y + 6)) return;

            try {
                const glitchBlock = player.dimension.getBlock(blockPos);
                if (!glitchBlock) return;

                if (glitchBlock.typeId !== "minecraft:grass_block") {
                    if (Math.random() < 0.5) {
                        glitchBlock.setPermutation(BlockPermutation.resolve("minecraft:oak_sign"));
                        sendTestMessage("A GLITCHED SIGN HAS APPEARED!");
                    } else {
                        glitchBlock.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                        sendTestMessage("A GLITCHED BLOCK HAS APPEARED!");
                    }
                } else {
                    for (let trunkY = blockPos.y + 1; trunkY <= blockPos.y + 6; trunkY++) {
                        player.dimension.getBlock({ x: blockPos.x, y: trunkY, z: blockPos.z })?.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));

                        if (trunkY === blockPos.y + 6) {
                            for (let leafX = -2; leafX <= 2; leafX++) {
                                for (let leafZ = -2; leafZ <= 2; leafZ++) {
                                    for (let leafY = trunkY - 3; leafY <= trunkY - 2; leafY++) {
                                        if (!isYValid(leafY)) continue;
                                        const isCorner = Math.abs(leafX) === 2 && Math.abs(leafZ) === 2;

                                        if (isCorner) {
                                            if (Math.random() < 0.4) player.dimension.getBlock({ x: blockPos.x + leafX, y: leafY, z: blockPos.z + leafZ })?.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                                        } else {
                                            player.dimension.getBlock({ x: blockPos.x + leafX, y: leafY, z: blockPos.z + leafZ })?.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                                        }

                                        if (leafX === 2 && leafY === trunkY - 2 && leafZ === 2) {
                                            for (let leafX2 = -1; leafX2 <= 1; leafX2++) {
                                                for (let leafZ2 = -1; leafZ2 <= 1; leafZ2++) {
                                                    for (let leafY2 = trunkY - 1; leafY2 <= trunkY; leafY2++) {
                                                        if (!isYValid(leafY2)) continue;
                                                        const isTopCorner = Math.abs(leafX2) === 1 && Math.abs(leafZ2) === 1;

                                                        if (isTopCorner) {
                                                            if (Math.random() < 0.33) player.dimension.getBlock({ x: blockPos.x + leafX2, y: leafY2, z: blockPos.z + leafZ2 })?.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                                                        } else {
                                                            player.dimension.getBlock({ x: blockPos.x + leafX2, y: leafY2, z: blockPos.z + leafZ2 })?.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                                                        }

                                                        if (leafX2 === 1 && leafY2 === trunkY && leafZ2 === 1) {
                                                            sendTestMessage("GLITCHED TREE SPAWNED!");
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
            } catch (error) { }
        }
    },
    function playScarySound() {
        for (const player of world.getAllPlayers()) {
            player.playSound("mob.dont_look.hit", { location: player.location });
        }
        sendTestMessage("SOUND PLAYED!");
    },
    function placeCross() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const player = players[Math.floor(Math.random() * players.length)];
            const originBlockPos = {
                x: player.location.x + (Math.random() * 200 - 100),
                y: Math.floor(player.location.y + (Math.random() * 100)),
                z: player.location.z + (Math.random() * 200 - 100)
            };

            if (!isYValid(originBlockPos.y - 2) || !isYValid(originBlockPos.y + 1)) return;

            try {
                player.dimension.getBlock(originBlockPos)?.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                player.dimension.getBlock({ x: originBlockPos.x, y: originBlockPos.y + 1, z: originBlockPos.z })?.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                player.dimension.getBlock({ x: originBlockPos.x - 1, y: originBlockPos.y, z: originBlockPos.z })?.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                player.dimension.getBlock({ x: originBlockPos.x + 1, y: originBlockPos.y, z: originBlockPos.z })?.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                player.dimension.getBlock({ x: originBlockPos.x, y: originBlockPos.y - 1, z: originBlockPos.z })?.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                player.dimension.getBlock({ x: originBlockPos.x, y: originBlockPos.y - 2, z: originBlockPos.z })?.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                sendTestMessage("GLITCHED CROSS SPAWNED!");
            } catch (e) { }
        }
    },
    function spawnFountainItem() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const player = players[Math.floor(Math.random() * players.length)];
            const totalItems = Math.floor(Math.random() * (64 - 16 + 1)) + 16;
            let itemsSpawned = 0;

            sendTestMessage("A FOUNTAIN OF ITEMS HAS APPEARED!");

            const fountainInterval = system.runInterval(() => {
                if (itemsSpawned >= totalItems) {
                    system.clearRun(fountainInterval);
                    return;
                }
                try {
                    const spawnPos = { x: player.location.x + (Math.random() * 4 - 2), y: player.location.y + 1.5, z: player.location.z + (Math.random() * 4 - 2) };
                    player.dimension.spawnItem(new ItemStack("no_png:no_texture_item", 1), spawnPos);
                    itemsSpawned++;
                } catch (e) { }
            }, 1);
        }
    },
    function spawnSingleItem() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const player = players[Math.floor(Math.random() * players.length)];
            const itemChoices = ["no_png:no_texture_item", "no_png:no_texture_disc", "minecraft:music_disc_11", "minecraft:music_disc_13"];
            const selectedItem = itemChoices[Math.floor(Math.random() * itemChoices.length)];

            sendTestMessage("A SINGLE ITEM HAS BEEN GIVEN!");
            try {
                player.dimension.spawnItem(new ItemStack(selectedItem, 1), player.location);
            } catch (e) { }
        }
    },
    function corruptChunk() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const player = players[Math.floor(Math.random() * players.length)];
            const py = Math.floor(player.location.y);
            const startY = Math.max(MIN_Y + 1, py - 10);
            const endY = Math.min(MAX_Y, py + 10);
            let chunkCorrupted = false;

            for (let chunkY = startY; chunkY <= endY; chunkY++) {
                for (let chunkX = -7; chunkX <= 8; chunkX++) {
                    for (let chunkZ = -7; chunkZ <= 8; chunkZ++) {
                        try {
                            const chunk = player.dimension.getBlock({ x: Math.floor(player.location.x) + chunkX, y: chunkY, z: Math.floor(player.location.z) + chunkZ });
                            if (chunk && chunk.typeId !== "minecraft:air" && chunk.typeId !== "no_png:missingtexture_block") {
                                if (Math.random() < 0.1) {
                                    chunk.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                                    chunkCorrupted = true;
                                }
                            }
                        } catch (e) { }
                    }
                }
            }
            if (chunkCorrupted) sendTestMessage("A CHUNK HAS BEEN CORRUPTED!");
        }
    },
    function breakDoor() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const player = players[Math.floor(Math.random() * players.length)];
            const py = Math.floor(player.location.y);
            const px = Math.floor(player.location.x);
            const pz = Math.floor(player.location.z);
            let doorBroken = false;

            for (let chunkY = Math.max(MIN_Y + 1, py - 7); chunkY <= Math.min(MAX_Y, py + 8); chunkY++) {
                for (let chunkX = -7; chunkX <= 8; chunkX++) {
                    for (let chunkZ = -7; chunkZ <= 8; chunkZ++) {
                        try {
                            const chunk = player.dimension.getBlock({ x: px + chunkX, y: chunkY, z: pz + chunkZ });
                            if (chunk && chunk.typeId.endsWith("_door")) {
                                player.dimension.runCommand(`setblock ${chunk.location.x} ${chunk.location.y} ${chunk.location.z} air [] destroy`);
                                doorBroken = true;
                            }
                        } catch (e) { }
                    }
                }
            }
            if (doorBroken) sendTestMessage("All doors in the chunk have been broken!");
        }
    },
    function spawnPlayerEntity() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const player = players[Math.floor(Math.random() * players.length)];
            let entityAlreadyExists = false;

            for (const dimName of ["overworld", "nether", "the_end"]) {
                try {
                    if (world.getDimension(dimName).getEntities({ type: "no_png:player_entity" }).length > 0) {
                        entityAlreadyExists = true;
                        break;
                    }
                } catch (e) { }
            }

            if (entityAlreadyExists) return false;

            try {
                const newPlayerEntity = player.dimension.spawnEntity("no_png:player_entity", { x: player.location.x, y: player.location.y + 0.5, z: player.location.z });
                if (newPlayerEntity) newPlayerEntity.nameTag = "D3rh3nter3";
                sendTestMessage("PLAYER ENTITY SPAWNED!");
            } catch (e) { }
        }
    }
];

function eventDirector() {

    if (!events) return;

    sendTestMessage("Event started/reset!");

    system.runTimeout(() => {
        try {
            // 1. Get all online players
            const allPlayers = world.getAllPlayers();

            // 2. Filter to see if any player is actually in the Overworld
            const overworldPlayers = allPlayers.filter(p => p.dimension.id === "minecraft:overworld");

            // 3. If nobody is in the Overworld, stop here and let 'finally' queue the next check
            if (overworldPlayers.length === 0) {
                return;
            }

            // 4. If we made it here, someone is in the overworld. Proceed with event logic.
            let eventSucceeded = false;
            let attempts = 0;

            while (!eventSucceeded && attempts < 10) {
                attempts++;
                if (randomEvents[Math.floor(Math.random() * randomEvents.length)]() !== false) {
                    eventSucceeded = true;
                }
            }
        } catch (error) {
            console.warn("Event crashed safely: " + error);
        } finally {
            // This guarantees the loop keeps ticking for when players return to the Overworld
            eventDirector();
        }
    }, Math.floor(Math.random() * 100) + 100);
}

const entitySpawnMap = {
    "no_png:chicken_no_texture": "no_png:dont_look_at_me",
    "no_png:cow_no_texture": "no_png:dont_look_at_me_cow",
    "no_png:pig_no_texture": "no_png:dont_look_at_me_pig",
    "no_png:sheep_no_texture": "no_png:dont_look_at_me_sheep"
};

world.afterEvents.entitySpawn.subscribe((event) => {

    if (!events) return;

    const entity = event.entity;
    if (entity?.typeId && entitySpawnMap[entity.typeId]) {
        let spawned = false;
        let attempts = 0;

        while (!spawned && attempts < 25) {
            attempts++;
            const spawnPos = { x: entity.location.x + (Math.random() * 80 - 40), y: entity.location.y, z: entity.location.z + (Math.random() * 80 - 40) };

            if (isAreaAir(entity.dimension, spawnPos, 3, 2, 1)) {
                try {
                    entity.dimension.spawnEntity(entitySpawnMap[entity.typeId], spawnPos);
                    sendTestMessage("§b[Test]§r A friend has arrived after " + attempts + " attempts.");
                    spawned = true;
                } catch (error) { }
            }
        }
    }
});

system.runInterval(() => {
    const dimension = world.getDimension("overworld");
    const entities = dimension.getEntities().filter(e =>
        e.typeId === "no_png:dont_look_at_me" || e.typeId === "no_png:dont_look_at_me_cow" ||
        e.typeId === "no_png:dont_look_at_me_pig" || e.typeId === "no_png:dont_look_at_me_sheep"
    );

    for (const entity of entities) {
        const targetY = Math.floor(entity.location.y) - 1;
        if (isYValid(targetY)) {
            try {
                const blockBelow = dimension.getBlock({ x: Math.floor(entity.location.x), y: targetY, z: Math.floor(entity.location.z) });
                if (blockBelow && blockBelow.typeId !== "no_png:missingtexture_block" && blockBelow.typeId !== "minecraft:air") {
                    blockBelow.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                }
            } catch (e) { }
        }
    }
}, 5);

system.runInterval(() => {
    const dimension = world.getDimension("overworld");
    const herobrine = dimension.getEntities().find(e => e.typeId === "no_png:active_herobrine");

    if (herobrine) {
        const targetPlayers = dimension.getPlayers().filter(p => {
            const dist = Math.sqrt(Math.pow(p.location.x - herobrine.location.x, 2) + Math.pow(p.location.y - herobrine.location.y, 2) + Math.pow(p.location.z - herobrine.location.z, 2));
            return dist < 64;
        });

        if (targetPlayers.length > 0) {
            const player = targetPlayers[0];
            const heightDiff = player.location.y - herobrine.location.y;
            const horizontalDist = Math.sqrt(Math.pow(player.location.x - herobrine.location.x, 2) + Math.pow(player.location.z - herobrine.location.z, 2));

            const isHerobrineActive = (herobrine.getComponent("minecraft:variant")?.value || 0) === 1;
            const isAdjacentHorizontally = (
                (Math.abs(Math.floor(player.location.x) - Math.floor(herobrine.location.x)) === 1 && Math.floor(player.location.z) === Math.floor(herobrine.location.z)) ||
                (Math.abs(Math.floor(player.location.z) - Math.floor(herobrine.location.z)) === 1 && Math.floor(player.location.x) === Math.floor(herobrine.location.x))
            );

            if (heightDiff > 1 && horizontalDist < 10 && player.getGameMode() !== "creative" && isHerobrineActive && isAdjacentHorizontally) {
                try {
                    herobrine.applyKnockback(0, 0, 0, 0.6);
                    const blockPos = { x: Math.floor(herobrine.location.x), y: Math.floor(herobrine.location.y), z: Math.floor(herobrine.location.z) };

                    if (isYValid(blockPos.y)) {
                        const blockBelow = dimension.getBlock(blockPos);
                        if (blockBelow?.typeId === "minecraft:air") {
                            system.runTimeout(() => { try { blockBelow.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block")); } catch (e) { } }, 5);
                        }
                    }
                } catch (e) { }
            }
        }
    }
}, 10);

world.afterEvents.itemUseOn.subscribe((event) => {

    if (!events) return;

    const { itemStack: item, block } = event;
    if (item && (item.typeId === "minecraft:flint_and_steel" || item.typeId === "minecraft:fire_charge") && block?.typeId === "minecraft:netherrack") {
        const mossyPos = { x: block.location.x, y: block.location.y - 1, z: block.location.z };
        if (!isYValid(mossyPos.y)) return;

        try {
            if (block.dimension.getBlock(mossyPos)?.typeId === "minecraft:mossy_cobblestone") {
                let allGold = true;
                for (let offsetX = -1; offsetX <= 1; offsetX++) {
                    for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
                        if (offsetX === 0 && offsetZ === 0) continue;
                        if (block.dimension.getBlock({ x: mossyPos.x + offsetX, y: mossyPos.y, z: mossyPos.z + offsetZ })?.typeId !== "minecraft:gold_block") { allGold = false; break; }
                    }
                    if (!allGold) break;
                }

                if (allGold) {
                    let allRed = true;
                    for (let redX = -1; redX <= 1; redX++) {
                        for (let redZ = -1; redZ <= 1; redZ++) {
                            if (Math.abs(redX) === Math.abs(redZ)) continue;
                            if (block.dimension.getBlock({ x: block.location.x + redX, y: block.location.y, z: block.location.z + redZ })?.typeId !== "minecraft:redstone_torch") { allRed = false; break; }
                        }
                        if (!allRed) break;
                    }

                    if (allRed) {
                        let allAir = true;
                        for (let airX = -1; airX <= 1; airX++) {
                            for (let airZ = -1; airZ <= 1; airZ++) {
                                if (airX === 0 || airZ === 0) continue;
                                if (block.dimension.getBlock({ x: block.location.x + airX, y: block.location.y, z: block.location.z + airZ })?.typeId !== "minecraft:air") { allAir = false; break; }
                            }
                            if (!allAir) break;
                        }

                        if (allAir) {
                            block.dimension.spawnEntity("minecraft:lightning_bolt", { x: block.location.x + 0.5, y: block.location.y + 1, z: block.location.z + 0.5 });
                            block.dimension.spawnEntity("no_png:active_herobrine", { x: block.location.x + 0.5, y: block.location.y + 2, z: block.location.z + 0.5 });
                            block.dimension.playSound("mob.dont_look.hit", { x: block.location.x + 0.5, y: block.location.y + 2, z: block.location.z + 0.5 });
                            block.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));

                            for (let x = -1; x <= 1; x++) {
                                for (let z = -1; z <= 1; z++) {
                                    if (Math.abs(x) === Math.abs(z)) continue;
                                    const torchBlock = block.dimension.getBlock({ x: block.location.x + x, y: block.location.y, z: block.location.z + z });
                                    torchBlock?.setPermutation(BlockPermutation.resolve("minecraft:unlit_redstone_torch"));
                                    system.runTimeout(() => { try { torchBlock?.setPermutation(BlockPermutation.resolve("no_png:burnt_out_torch")); } catch (e) { } }, 100);
                                }
                            }

                            for (let offsetX = -1; offsetX <= 1; offsetX++) {
                                for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
                                    if (Math.random() < 0.5) {
                                        system.runTimeout(() => { try { block.dimension.getBlock({ x: mossyPos.x + offsetX, y: mossyPos.y, z: mossyPos.z + offsetZ })?.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block")); } catch (e) { } }, 100 + Math.floor(Math.random() * 200));
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
    if (deadEntity.typeId === "no_png:player_entity") {
        const killer = damageSource?.damagingEntity;
        if (killer && killer.typeId === "minecraft:player") {
            world.sendMessage(`${deadEntity.nameTag} was slain by ${killer.name}`);
        }
    }
});


// --- DIMENSION TRAVEL LOGIC ---
async function ensurePlatformBuilt(config, player) { // Added player here
    // 1. Check persistent world storage first
    const propertyKey = `built_${config.dimensionId}`;
    const hasBeenBuilt = world.getDynamicProperty(propertyKey);

    // 2. Return early if it's already in memory OR saved to the world file
    if (hasBeenBuilt || builtDimensions.has(config.dimensionId)) {
        // Keep the memory set updated just in case
        builtDimensions.add(config.dimensionId);
        return;
    }

    const dim = world.getDimension(config.dimensionId);
    const tickingAreaId = `${config.dimensionId}_platform`;
    const margin = 2;

    // Dynamically grab the height if a 3D size is provided, otherwise default to 4
    const heightBound = config.size ? config.size.y : 4;

    await world.tickingAreaManager.createTickingArea(tickingAreaId, {
        dimension: dim,
        from: { x: config.center.x - config.radius - margin, y: config.center.y - 1, z: config.center.z - config.radius - margin },
        to: { x: config.center.x + config.radius + margin, y: config.center.y + heightBound + margin, z: config.center.z + config.radius + margin },
    });

    // Pass the entire config object to make parameter handling cleaner
    buildPlatform(dim, config);
    if (config.decor) buildDecor(dim, config.center);

    if (config.dimensionId === THE_GARDEN_ID) {
        const TREE_NAMES = [
            "glitch_birch", "glitch_cherry", "glitch_dark_oak", "glitch_jungle",
            "glitch_mangrove", "glitch_oak", "glitch_spruce", "glitch_acacia", "glitch_pale_oak", "glitch_giant_spruce", "glitch_warped_fungus", "glitch_crimson_fungus", "glitch_fountain", "garden_chest", "glitch_poppy", "glitch_dandelion", "glitch_rose_bush"
        ];

        for (let i = 0; i < 175; i++) {
            const RANDOM_TREE = TREE_NAMES[Math.floor(Math.random() * TREE_NAMES.length)];
            const randomPosX = Math.floor(Math.random() * 55) - 31;
            const randomPosZ = Math.floor(Math.random() * 55) - 31;

            world.structureManager.place(RANDOM_TREE, dim, { x: config.center.x + randomPosX, y: config.center.y + 1, z: config.center.z + randomPosZ });
        }
    }

    if (config.dimensionId === SKY_BLOCK_ID) {
        world.structureManager.place("glitch_oak", dim, { x: config.center.x - 2, y: config.center.y + 3, z: config.center.z - 1 });
        world.structureManager.place("sky_block_chest", dim, { x: config.center.x, y: config.center.y + 3, z: config.center.z });
    }



    if (config.dimensionId === MINESHAFT_ID) {
        const location = {
            x: 3,
            y: 0,
            z: 3
        };

        try {
            const bounds = world.structureManager.placeJigsaw(
                "no_png:glitch_mineshaft", // Replace with your actual start pool identifier
                "no_png:glitch_mineshaft",    // Replace with the target jigsaw block name
                12,                            // maxDepth parameter (capped at 11 levels)
                dim,
                location
            );

        } catch (error) {
            console.warn(`[Jigsaw Error] ${error}`);
        }
    }


    world.tickingAreaManager.removeTickingArea(tickingAreaId);

    // 3. Mark as built in BOTH memory and persistent world storage
    builtDimensions.add(config.dimensionId);
    world.setDynamicProperty(propertyKey, true);
}

// Helper function to build a single 3D box matching exact sizes
function buildVolume(dim, perm, center, size) {
    // Calculate the starting corner based on the center point
    const startX = center.x - Math.floor(size.x / 2);
    const startY = center.y;
    const startZ = center.z - Math.floor(size.z / 2);

    // Loop exactly size.x, size.y, and size.z times
    for (let x = 0; x < size.x; x++) {
        for (let y = 0; y < size.y; y++) {
            for (let z = 0; z < size.z; z++) {
                dim.getBlock({
                    x: startX + x,
                    y: startY + y,
                    z: startZ + z
                })?.setPermutation(perm);
            }
        }
    }
}

// Updated platform builder
function buildPlatform(dim, config) {
    const perm = BlockPermutation.resolve(config.blockId);

    if (config.size) {
        buildVolume(dim, perm, config.center, config.size);
        if (config.extensions) {
            for (const ext of config.extensions) {
                const extCenter = {
                    x: config.center.x + ext.offset.x,
                    y: config.center.y + ext.offset.y,
                    z: config.center.z + ext.offset.z
                };
                buildVolume(dim, perm, extCenter, ext.size);
            }
        }
    } else {
        // Flat 2D generation
        for (let x = -config.radius; x <= config.radius; x++) {
            for (let z = -config.radius; z <= config.radius; z++) {
                dim.getBlock({
                    x: config.center.x + x,
                    y: config.center.y,
                    z: config.center.z + z
                })?.setPermutation(perm);
            }
        }

        // --- NEW: Add this loop to build a 2-tall wall ---
        for (let i = -config.radius; i <= config.radius; i++) {
            // Define boundary coordinates
            const boundaries = [
                { x: config.center.x + i, z: config.center.z - config.radius }, // North
                { x: config.center.x + i, z: config.center.z + config.radius }, // South
                { x: config.center.x - config.radius, z: config.center.z + i }, // West
                { x: config.center.x + config.radius, z: config.center.z + i }  // East
            ];

            for (const pos of boundaries) {
                // Build 2 blocks high starting from the floor (y + 1 and y + 2)
                dim.getBlock({ x: pos.x, y: config.center.y + 1, z: pos.z })?.setPermutation(perm);
                dim.getBlock({ x: pos.x, y: config.center.y + 2, z: pos.z })?.setPermutation(perm);
                dim.getBlock({ x: pos.x, y: config.center.y + 3, z: pos.z })?.setPermutation(perm);
            }
        }
    }
}

function buildDecor(dim, center) {
    const glowstone = BlockPermutation.resolve("minecraft:glowstone");
    for (const ox of [-4, 4]) {
        for (const oz of [-4, 4]) {
            dim.getBlock({ x: center.x + ox, y: center.y + 3, z: center.z + oz })?.setPermutation(glowstone);
        }
    }
}

function showDimensionMenu(player) {
    const form = new ActionFormData()
        .title(`${Color.bold}Dimension Traveler`)
        .body(`You are currently in: ${Color.aqua}${player.dimension.id}\n\n${Color.reset}Choose a destination:`);

    for (const dim of DIMENSIONS) {
        form.button(dim.label);
    }

    form.show(player).then((response) => {
        if (response.canceled || response.selection === void 0) return;

        const selected = DIMENSIONS[response.selection];
        if (selected.id === player.dimension.id) {
            player.sendMessage(`${Color.yellow}You are already in that dimension!`);
            return;
        }

        const isCustom = PLATFORMS.some((platform) => platform.dimensionId === selected.id);
        if (isCustom) {
            teleportToCustomDimension(player, selected);
        } else {
            system.run(() => {
                player.teleport(selected.spawn, { dimension: world.getDimension(selected.id) });
            });
        }
    });
}

// --- ASYNC BLOCK SEARCH UTILITY ---
function findSpawnBlockAsync(dim, center) {
    return new Promise((resolve) => {
        const iterator = (function* () {
            let blocksChecked = 0;

            const searchRadius = 32;

            // Loop through the radius around the center coordinates
            for (let x = center.x - searchRadius; x <= center.x + searchRadius; x++) {
                for (let z = center.z - searchRadius; z <= center.z + searchRadius; z++) {
                    for (let y = center.y - searchRadius; y <= center.y + searchRadius; y++) {
                        try {
                            const block = dim.getBlock({ x, y, z });
                            if (block && block.typeId === "no_png:spawn_block") {
                                // If found, return coordinates exactly 1 block above the center of it
                                resolve({ x: x + 0.5, y: y + 1, z: z + 0.5 });
                                return;
                            }
                        } catch (e) {
                            // Safely ignore unloaded chunks outside the ticking area
                        }

                        blocksChecked++;
                        // Yield execution every 3000 blocks to prevent watchdog crashes
                        if (blocksChecked >= 3000) {
                            blocksChecked = 0;
                            yield;
                        }
                    }
                }
            }
            resolve(null); // Return null if the block is entirely missing
        })();

        system.runJob(iterator);
    });
}

async function teleportToCustomDimension(player, destination) {
    const dim = world.getDimension(destination.id);
    const tickingAreaId = `${destination.id}_teleport`;

    // Changed from a constant to a let variable so we can overwrite it if the spawn block is found
    let targetSpawn = destination.spawn;

    // Increase the load range to 128 to ensure the engine has enough buffer space
    const loadRange = (destination.id === "no_png:mineshaft") ? 128 : 4;

    await world.tickingAreaManager.createTickingArea(tickingAreaId, {
        dimension: dim,
        from: { x: targetSpawn.x - loadRange, y: targetSpawn.y - loadRange, z: targetSpawn.z - loadRange },
        to: { x: targetSpawn.x + loadRange, y: targetSpawn.y + loadRange, z: targetSpawn.z + loadRange },
    });

    const config = PLATFORMS.find((platform) => platform.dimensionId === destination.id);
    if (config) await ensurePlatformBuilt(config, player);

    // --- NEW: Check for spawn block specifically in the Mineshaft ---
    if (destination.id === MINESHAFT_ID) {


        // Searches a 128x128 area around the dimension's default center, from Y=10 to Y=60
        // You can increase the radius (64) or Y bounds (10, 60) if your jigsaw generation is larger
        const foundSpawn = await findSpawnBlockAsync(dim, targetSpawn);

        if (foundSpawn) {
            targetSpawn = foundSpawn; // Overwrite default spawn with the found block's coordinates
        } else {

        }
    }

    // Teleport the player to the newly determined coordinates
    // Teleport the player to the newly determined coordinates
    player.teleport(targetSpawn, { dimension: dim });

    // 2. PLAY EXPLODE PARTICLE/SOUND AT ARRIVAL LOCATION
    // Delaying by 5 ticks ensures the client has loaded the new dimension before playing it
    system.runTimeout(() => {
        dim.spawnParticle("no_png:missing_particle_absorb", targetSpawn);
        // player.playSound("no_png:missing_particle_explode", { location: targetSpawn }); // Uncomment if it's a sound
    }, 5);

    world.tickingAreaManager.removeTickingArea(tickingAreaId);

}