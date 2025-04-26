const { EmbedBuilder } = require("discord.js");
const pool = require("../database");
const { MessageFlags } = require("discord.js");

module.exports = async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === "view_guild_members") {
    const discordGuildId = interaction.guild.id;

    try {
      // Defer the reply if there is any heavy database query or processing
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // Defer the reply to allow async operations

      // Get all registered players in the guild, sorted by level
      const membersResult = await pool.query(
        `SELECT discord_user_id, level
         FROM players
         WHERE discord_guild_id = $1
         ORDER BY level DESC`,
        [discordGuildId]
      );

      if (membersResult.rows.length === 0) {
        return await interaction.editReply({
          content: "There are no registered mages yet.",
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

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return await interaction.editReply({
        content: "Error fetching members.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
};
