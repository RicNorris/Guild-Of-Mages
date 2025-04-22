const { EmbedBuilder } = require("discord.js");
const pool = require("../database");

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "view_guild_members") {
    const discordGuildId = interaction.guild.id;

    try {
      // Get all registered players in the guild, sorted by level
      const membersResult = await pool.query(
        `SELECT discord_user_id, level
         FROM players
         WHERE discord_guild_id = $1
         ORDER BY level DESC`,
        [discordGuildId]
      );

      if (membersResult.rows.length === 0) {
        return interaction.reply({
          content: "There are no registered mages yet.",
          ephemeral: true,
        });
      }

      // Create a list of players with their name and level
      const lines = membersResult.rows.map(
        (player, index) =>
          `**${index + 1}.** <@${player.discord_user_id}> — Level ${
            player.level
          }`
      );

      // Create and send the embed with the players' information
      const embed = new EmbedBuilder()
        .setTitle("📜 Registered Mages")
        .setDescription(lines.join("\n"))
        .setColor(0x6e00ff);

      await interaction.reply({ embeds: [embed], ephemeral: true });
    } catch (err) {
      console.error(err);
      return interaction.reply({
        content: "Error fetching members.",
        ephemeral: true,
      });
    }
  }
};
