import { world, system } from "@minecraft/server"; // Added system to the import

world.afterEvents.entitySpawn.subscribe((event) => {
    const chicken = event.entity;

    if (chicken?.typeId === "no_png:chicken_no_texture") {
        if (Math.random() < 0.33) {
            const { dimension, location } = chicken;
            const entitySpawn = "no_png:dont_look_at_me";

            const randomX = location.x + (Math.random() * 80 - 40);
            const randomZ = location.z + (Math.random() * 80 - 40);

            const spawnPos = { x: randomX, y: location.y, z: randomZ };

            try {
                dimension.spawnEntity(entitySpawn, spawnPos);
                // Testing message
                world.sendMessage("§b[Test]§r A friend has arrived.");
            } catch (error) {
                console.warn("Failed to spawn entity: " + error);
            }
        }
    }
});

system.runInterval(() => {
    const dimension = world.getDimension("overworld");
    const entities = dimension.getEntities({
        type: "no_png:dont_look_at_me"
    });

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