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
  console.log("Tower image URL:", imageUrl);

  const embed = new EmbedBuilder()
    .setTitle("🗼 Guild Tower")
    .addFields(
      { name: "Level", value: `${tower.level}`, inline: true },
      { name: "XP", value: `${tower.xp}`, inline: true },
      { name: "Energy Pool", value: `${tower.energy_pool}`, inline: true },
      {
        name: "Rooms",
        value:
          tower.rooms.length > 0
            ? tower.rooms.map((r) => `• ${r}`).join("\n")
            : "No rooms unlocked yet.",
        inline: true,
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
