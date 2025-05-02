const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const pool = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("demote")
    .setDescription("Demote a member from officer status.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to demote")
        .setRequired(true)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const guildId = interaction.guild.id;

    // Fetch guild data and check if user is authorized
    const guildRes = await pool.query(
      "SELECT * FROM guilds WHERE discord_guild_id = $1",
      [guildId]
    );
    const guild = guildRes.rows[0];

    // Check if the requester is authorized (Owner or Officer)
    const memberRes = await pool.query(
      "SELECT * FROM players WHERE discord_user_id = $1 AND guild_id = $2",
      [interaction.user.id, guild.id]
    );
    const requester = memberRes.rows[0];
    if (requester.role !== "owner" && requester.role !== "officer") {
      return interaction.reply({
        content: "You don't have permission to demote members.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Update the member's role in the database
    await pool.query(
      "UPDATE players SET role = 'member' WHERE discord_user_id = $1 AND guild_id = $2",
      [user.id, guild.id]
    );

    return interaction.reply({
      content: `<@${user.id}> has been demoted to Member.`,
    });
  },
};
