import {
    world,
    system,
    ItemStack,
    Player,
    BlockPermutation,
    BlockVolume,
    CustomCommandStatus,
    CommandPermissionLevel
} from "@minecraft/server";

import { ActionFormData } from "@minecraft/server-ui";

// --- GLITCH & HEROBRINE CONSTANTS ---
const MIN_Y = -64;
const MAX_Y = 319;

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
};

const THE_PLANE_ID = "no_png:the_plane";
const SKY_LOUNGE_ID = "custom_dim:sky_lounge";
const ENDLESS_RUNNER_ID = "custom_dim:endless_runner";

const PLATFORMS = [
    { dimensionId: THE_PLANE_ID, blockId: "no_png:missingtexture_block", radius: 8, center: { x: 0, y: 64, z: 0 } }
];

var DIMENSIONS = [
    { label: `${Color.pink}The Plane ${Color.darkGray}(Infinite Repeating Plane of §kMISSINGTEXTURE§r)${Color.reset}`, id: THE_PLANE_ID, spawn: { x: 0, y: 66, z: 0 } },
    { label: `${Color.aqua}Sky Lounge ${Color.darkGray}(quartz platform high up)${Color.reset}`, id: SKY_LOUNGE_ID, spawn: { x: 0, y: 102, z: 0 } },
    { label: `${Color.yellow}Endless Runner ${Color.darkGray}(sprint & survive!)${Color.reset}`, id: ENDLESS_RUNNER_ID, spawn: { x: 0, y: 66, z: 0 } },
    { label: `${Color.green}Overworld${Color.reset}`, id: "minecraft:overworld", spawn: { x: 0, y: 64, z: 0 } },
    { label: `${Color.darkRed}The Nether${Color.reset}`, id: "minecraft:nether", spawn: { x: 0, y: 64, z: 0 } },
    { label: `${Color.purple}The End${Color.reset}`, id: "minecraft:the_end", spawn: { x: 0, y: 64, z: 0 } },
];

const builtDimensions = new Set();

// --- STARTUP & WORLD LOAD EVENTS ---
system.beforeEvents.startup.subscribe((event) => {
    event.dimensionRegistry.registerCustomDimension(THE_PLANE_ID);
    event.dimensionRegistry.registerCustomDimension(SKY_LOUNGE_ID);
    event.dimensionRegistry.registerCustomDimension(ENDLESS_RUNNER_ID);

    event.customCommandRegistry.registerCommand(
        {
            name: "custom_dim:dimensions",
            description: "Open the dimension travel menu",
            permissionLevel: CommandPermissionLevel.Any,
            cheatsRequired: false,
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
    for (const platform of PLATFORMS) {
        ensurePlatformBuilt(platform);
    }

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
                world.sendMessage(`§4[ERROR]§r ${player.name} corrupted a ${blockId.split(":")[1].toUpperCase()}`);
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
                if (Math.random() > 0.01) {
                    world.sendMessage(`§k${player.name}§r${player.name}§k${player.name}§r . . . you aren't allowed to hear that . . .`);
                } else {
                    world.sendMessage(`§k${player.name}§r${player.name}§k${player.name}§r . . . you aren't allowed to hear what HE has to say . . . . . .`);
                }
            } catch (error) {
                console.warn("Failed to glitch jukebox: " + error);
            }
        } else if (mainHandItem?.typeId === "minecraft:music_disc_11" || mainHandItem?.typeId === "minecraft:music_disc_13") {
            dimension.spawnParticle("no_png:missing_particle", location);
        }
    }
});

const randomEvents = [
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
                world.sendMessage("HEROBRINE SPAWNED!");
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
                        world.sendMessage("A GLITCHED SIGN HAS APPEARED!");
                    } else {
                        glitchBlock.setPermutation(BlockPermutation.resolve("no_png:missingtexture_block"));
                        world.sendMessage("A GLITCHED BLOCK HAS APPEARED!");
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
            } catch (error) { }
        }
    },
    function playScarySound() {
        for (const player of world.getAllPlayers()) {
            player.playSound("mob.dont_look.hit", { location: player.location });
        }
        world.sendMessage("SOUND PLAYED!");
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
                world.sendMessage("GLITCHED CROSS SPAWNED!");
            } catch (e) { }
        }
    },
    function spawnFountainItem() {
        const players = world.getAllPlayers();
        if (players.length > 0) {
            const player = players[Math.floor(Math.random() * players.length)];
            const totalItems = Math.floor(Math.random() * (64 - 16 + 1)) + 16;
            let itemsSpawned = 0;

            world.sendMessage("A FOUNTAIN OF ITEMS HAS APPEARED!");

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

            world.sendMessage("A SINGLE ITEM HAS BEEN GIVEN!");
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
            if (chunkCorrupted) world.sendMessage("A CHUNK HAS BEEN CORRUPTED!");
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
            if (doorBroken) world.sendMessage("All doors in the chunk have been broken!");
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
                world.sendMessage("PLAYER ENTITY SPAWNED!");
            } catch (e) { }
        }
    }
];

function eventDirector() {
    world.sendMessage("Event started/reset!");
    system.runTimeout(() => {
        try {
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
                    world.sendMessage("§b[Test]§r A friend has arrived after " + attempts + " attempts.");
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
async function ensurePlatformBuilt(config) {
    if (builtDimensions.has(config.dimensionId)) return;

    const dim = world.getDimension(config.dimensionId);
    const tickingAreaId = `${config.dimensionId}_platform`;
    const margin = 2;

    await world.tickingAreaManager.createTickingArea(tickingAreaId, {
        dimension: dim,
        from: { x: config.center.x - config.radius - margin, y: config.center.y - 1, z: config.center.z - config.radius - margin },
        to: { x: config.center.x + config.radius + margin, y: config.center.y + 4, z: config.center.z + config.radius + margin },
    });

    // Removed the "config.rails" check from the end of this line
    buildPlatform(dim, config.blockId, config.radius, config.center);
    if (config.decor) buildDecor(dim, config.center);

    if (config.dimensionId === THE_PLANE_ID) {
        // Defines RANDOM_TREE as a randomly selected string from the provided list of glitch/pale trees.
        const TREE_NAMES = [
            "glitch_birch",
            "glitch_cherry",
            "glitch_dark_oak",
            "glitch_jungle",
            "glitch_mangrove",
            "glitch_oak",
            "glitch_spruce",
            "glitch_acacia", // Corrected spacing from "glitch_ acacia"
            "pale_oak"
        ];
        const RANDOM_TREE = TREE_NAMES[Math.floor(Math.random() * TREE_NAMES.length)];
        world.structureManager.place(RANDOM_TREE, dim, { x: config.center.x, y: config.center.y + 1, z: config.center.z });
    }

    world.tickingAreaManager.removeTickingArea(tickingAreaId);
    builtDimensions.add(config.dimensionId);
}

function buildPlatform(dim, blockId, radius, center) {
    const perm = BlockPermutation.resolve(blockId);
    // This loop simply generates the flat floor with no borders
    for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
            dim.getBlock({ x: center.x + x, y: center.y, z: center.z + z })?.setPermutation(perm);
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
                player.sendMessage(`${Color.green}Teleported to ${selected.label}${Color.green}!`);
            });
        }
    });
}

async function teleportToCustomDimension(player, destination) {
    const dim = world.getDimension(destination.id);
    const tickingAreaId = `${destination.id}_teleport`;
    const spawn = destination.spawn;

    player.sendMessage(`${Color.yellow}Loading ${destination.label}${Color.yellow}...`);

    await world.tickingAreaManager.createTickingArea(tickingAreaId, {
        dimension: dim,
        from: { x: spawn.x - 4, y: spawn.y - 4, z: spawn.z - 4 },
        to: { x: spawn.x + 4, y: spawn.y + 4, z: spawn.z + 4 },
    });

    const config = PLATFORMS.find((platform) => platform.dimensionId === destination.id);
    if (config) await ensurePlatformBuilt(config);

    player.teleport(spawn, { dimension: dim });
    player.sendMessage(`${Color.green}Teleported to ${destination.label}${Color.green}!`);
    world.tickingAreaManager.removeTickingArea(tickingAreaId);

    if (destination.id === ENDLESS_RUNNER_ID) startRunner(player);
}

// --- ENDLESS RUNNER MINIGAME ---
const RUNNER_PATH_HALF_WIDTH = 1;
const RUNNER_FLOOR_Y = 64;
const RUNNER_SEGMENT_LENGTH = 30;
const RUNNER_LOOK_AHEAD = 40;
const RUNNER_ZOMBIE_INTERVAL = 40;
const RUNNER_TICKING_AREA_ID = "endless_runner_ahead";

function turnRight(dir) { return { dx: -dir.dz, dz: dir.dx }; }
function turnLeft(dir) { return { dx: dir.dz, dz: -dir.dx }; }
function sameDir(a, b) { return a.dx === b.dx && a.dz === b.dz; }
function cellKey(x, z) { return `${Math.round(x / RUNNER_SEGMENT_LENGTH)},${Math.round(z / RUNNER_SEGMENT_LENGTH)}`; }

const runner = {
    active: false,
    headX: 0,
    headZ: 0,
    dir: { dx: 0, dz: 1 },
    occupiedCells: new Set(),
    intervalId: undefined,
    zombies: [],
    tickCount: 0,
    lastTickingX: 0,
    lastTickingZ: 0,
};

async function startRunner(player) {
    stopRunner();
    const dim = world.getDimension(ENDLESS_RUNNER_ID);

    runner.dir = { dx: 0, dz: 1 };
    runner.headX = 0;
    runner.headZ = 0;
    runner.occupiedCells = new Set();
    runner.occupiedCells.add(cellKey(0, 0));
    runner.lastTickingX = 0;
    runner.lastTickingZ = 0;

    await updateRunnerTickingArea(dim, 0, 0);
    generateNextSegment(dim);
    player.addEffect("speed", 20 * 600, { amplifier: 1, showParticles: false });

    runner.active = true;
    runner.tickCount = 0;

    player.sendMessage(`${Color.yellow}${Color.bold}GO! ${Color.reset}${Color.gray}Run forward to survive. Zombies are coming!`);

    runner.intervalId = system.runInterval(() => {
        runner.tickCount += 5;

        if (player.dimension.id !== ENDLESS_RUNNER_ID) {
            stopRunner();
            return;
        }

        if (player.location.y < RUNNER_FLOOR_Y - 10) {
            player.sendMessage(`${Color.red}${Color.bold}Game Over! ${Color.reset}${Color.gray}You fell off the path.`);
            stopRunner();
            return;
        }

        if (Math.abs(runner.headX - runner.lastTickingX) > 20 || Math.abs(runner.headZ - runner.lastTickingZ) > 20) {
            updateRunnerTickingArea(dim, runner.headX, runner.headZ);
        }

        const distSq = Math.pow(runner.headX - player.location.x, 2) + Math.pow(runner.headZ - player.location.z, 2);
        if (distSq < RUNNER_LOOK_AHEAD * RUNNER_LOOK_AHEAD) generateNextSegment(dim);

        if (runner.tickCount % RUNNER_ZOMBIE_INTERVAL === 0) spawnRunnerZombie(dim, player);

        runner.zombies = runner.zombies.filter((z) => {
            if (!z.isValid || z.location.y < RUNNER_FLOOR_Y - 20) {
                if (z.isValid) z.remove();
                return false;
            }
            return true;
        });
    }, 5);
}

function generateNextSegment(dim) {
    const straight = runner.dir;
    const candidates = [straight, turnLeft(straight), turnRight(straight)].filter((d) => {
        return !runner.occupiedCells.has(cellKey(runner.headX + d.dx * RUNNER_SEGMENT_LENGTH, runner.headZ + d.dz * RUNNER_SEGMENT_LENGTH));
    });

    let chosen;
    if (candidates.length === 0) chosen = straight;
    else if (candidates.some((c) => sameDir(c, straight)) && Math.random() < 0.5) chosen = straight;
    else chosen = candidates[Math.floor(Math.random() * candidates.length)];

    if (!sameDir(chosen, runner.dir)) fillCorner(dim, runner.headX, runner.headZ);

    runner.dir = chosen;
    buildLedgeSegment(dim, runner.headX, runner.headZ, chosen, RUNNER_SEGMENT_LENGTH);

    runner.headX += chosen.dx * RUNNER_SEGMENT_LENGTH;
    runner.headZ += chosen.dz * RUNNER_SEGMENT_LENGTH;
    runner.occupiedCells.add(cellKey(runner.headX, runner.headZ));
}

function buildLedgeSegment(dim, fromX, fromZ, dir, length) {
    const hw = RUNNER_PATH_HALF_WIDTH;
    const y = RUNNER_FLOOR_Y;
    const toX = fromX + dir.dx * (length - 1);
    const toZ = fromZ + dir.dz * (length - 1);

    dim.fillBlocks(
        new BlockVolume(
            { x: Math.min(fromX, toX) - Math.abs(dir.dz) * hw, y, z: Math.min(fromZ, toZ) - Math.abs(dir.dx) * hw },
            { x: Math.max(fromX, toX) + Math.abs(dir.dz) * hw, y, z: Math.max(fromZ, toZ) + Math.abs(dir.dx) * hw }
        ),
        BlockPermutation.resolve("minecraft:deepslate_bricks"),
        { ignoreChunkBoundErrors: true }
    );

    const glow = BlockPermutation.resolve("minecraft:glowstone");
    for (let i = 0; i < length; i += 10) {
        dim.getBlock({ x: fromX + dir.dx * i - Math.abs(dir.dz) * (hw + 1), y, z: fromZ + dir.dz * i - Math.abs(dir.dx) * (hw + 1) })?.setPermutation(glow);
        dim.getBlock({ x: fromX + dir.dx * i + Math.abs(dir.dz) * (hw + 1), y, z: fromZ + dir.dz * i + Math.abs(dir.dx) * (hw + 1) })?.setPermutation(glow);
    }
}

function fillCorner(dim, x, z) {
    const pad = RUNNER_PATH_HALF_WIDTH + 1;
    dim.fillBlocks(
        new BlockVolume({ x: x - pad, y: RUNNER_FLOOR_Y, z: z - pad }, { x: x + pad, y: RUNNER_FLOOR_Y, z: z + pad }),
        BlockPermutation.resolve("minecraft:deepslate_bricks"),
        { ignoreChunkBoundErrors: true }
    );
}

async function updateRunnerTickingArea(dim, centerX, centerZ) {
    if (world.tickingAreaManager.hasTickingArea(RUNNER_TICKING_AREA_ID)) {
        world.tickingAreaManager.removeTickingArea(RUNNER_TICKING_AREA_ID);
    }
    await world.tickingAreaManager.createTickingArea(RUNNER_TICKING_AREA_ID, {
        dimension: dim,
        from: { x: centerX - 50, y: RUNNER_FLOOR_Y - 2, z: centerZ - 50 },
        to: { x: centerX + 50, y: RUNNER_FLOOR_Y + 10, z: centerZ + 50 },
    });
    runner.lastTickingX = centerX;
    runner.lastTickingZ = centerZ;
}

function spawnRunnerZombie(dim, player) {
    const behindX = Math.floor(player.location.x) - runner.dir.dx * 10;
    const behindZ = Math.floor(player.location.z) - runner.dir.dz * 10;
    for (const side of [-1, 1]) {
        const zombie = dim.spawnEntity("minecraft:zombie", {
            x: behindX + Math.abs(runner.dir.dz) * side,
            y: RUNNER_FLOOR_Y + 1,
            z: behindZ + Math.abs(runner.dir.dx) * side,
        });
        zombie.addEffect("speed", 20 * 120, { amplifier: 2, showParticles: false });
        runner.zombies.push(zombie);
    }
}

function stopRunner() {
    if (runner.intervalId !== undefined) {
        system.clearRun(runner.intervalId);
        runner.intervalId = undefined;
    }
    for (const z of runner.zombies) { if (z.isValid) z.remove(); }

    runner.zombies = [];
    runner.active = false;
    runner.headX = 0;
    runner.headZ = 0;
    runner.dir = { dx: 0, dz: 1 };
    runner.occupiedCells = new Set();
    runner.tickCount = 0;
    runner.lastTickingX = 0;
    runner.lastTickingZ = 0;

    if (world.tickingAreaManager.hasTickingArea(RUNNER_TICKING_AREA_ID)) {
        world.tickingAreaManager.removeTickingArea(RUNNER_TICKING_AREA_ID);
    }
}