const { EmbedBuilder } = require("discord.js");
const pool = require("../database");
const towerImages = require("../handlers/towerImages");

async function displayTower(discordUserId) {
  // Get the guild ID of the player
  const playerRes = await pool.query(
    "SELECT guild_id FROM players WHERE discord_user_id = $1",
    [discordUserId]
  );

  if (playerRes.rows.length === 0 || !playerRes.rows[0].guild_id) {
    return { error: "❌ You're not in a guild!" };
  }

  const guildId = playerRes.rows[0].guild_id;

  // Get the tower data
  const towerRes = await pool.query(
    "SELECT * FROM guild_towers WHERE guild_id = $1",
    [guildId]
  );

  if (towerRes.rows.length === 0) {
    return { error: "❌ Your guild doesn't have a tower yet." };
  }

  const tower = towerRes.rows[0];

  const imageUrl = towerImages[tower.level] || towerImages.default;

  // Format rooms data
  const roomStatus =
    Object.entries(tower.rooms || {})
      .map(([roomName, roomData]) => {
        return `${roomName}: Level ${roomData.level}`;
      })
      .join("\n") || "No rooms unlocked yet.";

  const embed = new EmbedBuilder()
    .setTitle("🗼 Guild Tower")
    .addFields(
      { name: "Level", value: `${tower.level}`, inline: true },
      { name: "XP", value: `${tower.xp}`, inline: true },
      {
        name: "Energy Pool",
        value: `${tower.energy_pool} / ${tower.max_energy_pool} (${tower.energy_regen_rate}/min)`,
        inline: true,
      },
      {
        name: "Rooms",
        value:
          Object.keys(tower.rooms).length > 0
            ? Object.entries(tower.rooms)
                .map(
                  ([roomName, roomData]) =>
                    `• ${roomName} (Lvl ${roomData.level})`
                )
                .join("\n")
            : "No rooms unlocked yet.",

      },
      {
        name: "Upgrades",
        value:
          tower.current_upgrades.length > 0
            ? tower.current_upgrades.map((u) => `• ${u}`).join("\n")
            : "No upgrades in progress.",
        inline: false,
      }
    )
    .setDescription(tower.lore || "*No lore recorded yet.*")
    .setColor(0x9b59b6)
    .setImage(imageUrl)
    .setTimestamp();

  return { embed };
}

module.exports = displayTower;
