const pool = require("../database");
const ROOM_UPGRADES = require("../room_upgrades");
const TOWER_LEVEL_UPGRADES = require("../tower_upgrades");

async function applyTowerLevelUpgrades(tower) {
  const upgrades = TOWER_LEVEL_UPGRADES[tower.level];
  console.log("Applying tower level upgrades:", upgrades);
  if (!upgrades) return; // No upgrades for this level

  for (const { room, newLevel } of upgrades) {
    const current = tower.rooms[room]?.level || 1;

    if (newLevel > current) {
      console.log(`Upgrading ${room} from level ${current} to ${newLevel}`);
      tower.rooms[room].level = newLevel;
      const effectFn = ROOM_UPGRADES[room]?.[newLevel]?.effect;
      if (typeof effectFn === "function") {
        effectFn(tower); // Apply the effect of the upgrade
      }
    }
  }
}

async function regenerateGuildEnergy() {
  try {
    const result = await pool.query(
      `UPDATE guild_towers
         SET energy_pool = LEAST(energy_pool + energy_regen_rate, max_energy_pool)
         WHERE energy_pool < max_energy_pool`
    );
    console.log(`Regenerated energy for ${result.rowCount} guilds`);
  } catch (err) {
    console.error("Error regenerating energy:", err);
  }
}

module.exports = {
  applyTowerLevelUpgrades,
  startEnergyRegenLoop: function startEnergyRegenLoop(intervalMs = 60_000) {
    setInterval(regenerateGuildEnergy, intervalMs);
  },
};
