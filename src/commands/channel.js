const { SlashCommandBuilder } = require("discord.js");
const pool = require("../utils/database");
const redis = require("../utils/redisClient");

const CHANNEL_COOLDOWN_SECONDS = 2 * 60 * 60; // 2 hours

module.exports = {
  data: new SlashCommandBuilder()
    .setName("channel")
    .setDescription("Channel energy into the guild"),

  async execute(interaction) {
    try {
      // Fetch the player info
      const discordUserId = interaction.user.id;
      const discordGuildId = interaction.guild.id;
      const cooldownKey = `cooldown:channel:${discordUserId}`;

      const playerResult = await pool.query(
        `SELECT * FROM players WHERE discord_user_id = $1 AND discord_guild_id = $2`,
        [discordUserId, discordGuildId]
      );

      // Check if player is channeling in the right guild
      if (playerResult.rows.length === 0) {
        return interaction.reply({
          content: "You are not registered as a mage in this guild.",
          ephemeral: true,
        });
      }

      const player = playerResult.rows[0];

      // Check Redis for cooldown
      const ttl = await redis.ttl(cooldownKey);
      if (ttl > 0) {
        const minutesLeft = Math.ceil(ttl / 60);
        return interaction.reply({
          content: `⏳ You're still on cooldown! Please wait ${minutesLeft} minute(s) before you can meditate again.`,
          ephemeral: true,
        });
      }

    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "There was an error channeling energy.",
        ephemeral: true,
      });
    }
  },
};
