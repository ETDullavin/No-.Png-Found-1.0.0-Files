import { world } from "@minecraft/server";

world.afterEvents.entitySpawn.subscribe((event) => {
    const chicken = event.entity;

    // Check if it's your custom chicken
    if (chicken?.typeId === "no_png:chicken_no_texture") {
        const { dimension, location } = chicken;
        const entitySpawn = "elder_guardian";

        // Generate random coordinates within a 50-block range
        // Math.random() * 100 - 50 gives us a value between -50 and 50
        const randomX = location.x + (Math.random() * 100 - 50);
        const randomZ = location.z + (Math.random() * 100 - 50);

        // We keep the Y coordinate the same so it spawns at the same height
        const spawnPos = { x: randomX, y: location.y, z: randomZ };

        try {
            // Summon the Elder Guardian
            dimension.spawnEntity(entitySpawn, spawnPos);

            // Testing message
            world.sendMessage("§b[Test]§r A chicken spawned... and brought a large friend within 50 blocks.");
        } catch (error) {
            // This catches errors if the location is in an unloaded chunk
            console.warn("Failed to spawn Elder Guardian: " + error);
        }
    }
});