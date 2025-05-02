const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const pool = require("../utils/database");
const applyTowerLevelUpgrades =
  require("../utils/handlers/towerFunctions").applyTowerLevelUpgrades;
const towerImages = require("../utils/handlers/towerImages");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("levelup-tower")
    .setDescription("Developer command to level up the tower for testing."),

  async execute(interaction) {
    let guildId = interaction.guild.id;

    // Fetch the guildId from the database
    const guildRes = await pool.query(
      `SELECT * FROM guilds WHERE discord_guild_id = $1`,
      [guildId]
    );
    if (guildRes.rowCount === 0) {
      return interaction.reply({
        content: "Guild not found in the database.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const guild = guildRes.rows[0];
    guildId = guild.id; // Use the ID from the database

    // Fetch the tower
    const res = await pool.query(
      `SELECT * FROM guild_towers WHERE guild_id = $1`,
      [guildId]
    );

    if (res.rowCount === 0) {
      return interaction.reply({
        content: "Tower not found.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const tower = res.rows[0];
    const newLevel = tower.level + 1;
    tower.level = newLevel;

    // Parse JSONB rooms
    tower.rooms = tower.rooms || {};

    // Apply level-based upgrades (rooms + effects)
    await applyTowerLevelUpgrades(tower);

    // Save updated tower to DB
    await pool.query(
      `UPDATE guild_towers
       SET level = $1,
           rooms = $2,
           energy_regen_rate = $3,
           energy_pool = $4,
           max_energy_pool = $5
       WHERE guild_id = $6`,
      [
        tower.level,
        tower.rooms,
        tower.energy_regen_rate || 0,
        tower.energy_pool || 0,
        tower.max_energy_pool || 0,
        guildId,
      ]
    );

    // Get tower image
    const imageUrl =
      interaction.options.getString("image_url") ||
      towerImages.tower_level_up ||
      towerImages[newLevel] ||
      towerImages.default;

    // Create an embed with the image and tower details
    const embed = new EmbedBuilder()
      .setTitle(`Tower Level Up!`)
      .setDescription(
        `Tower leveled up to **Level ${newLevel}**! Upgrades applied.`
      )
      .setColor("#9B59B6")
      .setImage(imageUrl)
      .setFooter({ text: `Guild: ${guild.name || interaction.guild.name}` })
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
    });
  },
};
