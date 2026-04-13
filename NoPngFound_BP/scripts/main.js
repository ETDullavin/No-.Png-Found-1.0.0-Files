import { world, system } from "@minecraft/server"; // Added system to the import

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

world.afterEvents.entitySpawn.subscribe((event) => {
    const entity = event.entity;

    if (entity?.typeId === "no_png:chicken_no_texture" || entity?.typeId === "no_png:cow_no_texture") {

        const { dimension, location } = entity;
        const entitySpawn = entity.typeId === "no_png:cow_no_texture"
            ? "no_png:dont_look_at_me_cow"
            : "no_png:dont_look_at_me";

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
    const entities = dimension.getEntities().filter(entity =>
        entity.typeId === "no_png:dont_look_at_me" || entity.typeId === "no_png:dont_look_at_me_cow"
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