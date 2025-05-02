const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const pool = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("guild-admin")
    .setDescription("Manage your guild roles (Owner only)"),

  async execute(interaction) {
    const userId = interaction.user.id;
    const discordGuildId = interaction.guild.id;

    // Fetch guild info
    const guildRes = await pool.query(
      `SELECT id, name, owner_id FROM guilds WHERE discord_guild_id = $1`,
      [discordGuildId]
    );
    const guild = guildRes.rows[0];

    if (!guild || guild.owner_id !== userId) {
      return interaction.reply({
        content: "Only the guild owner can access the admin panel.",
        flags: MessageFlags.Ephemeral,
      });
    }

    // Fetch guild members
    const membersRes = await pool.query(
      `SELECT id, discord_user_id, role FROM players WHERE guild_id = $1`,
      [guild.id]
    );
    const members = membersRes.rows;

    // Fetch display names for members
    const displayList = await Promise.all(
      members.map(async (member) => {
        try {
          const guildMember = await interaction.guild.members.fetch(
            member.discord_user_id
          );
          return {
            ...member,
            displayName: guildMember.displayName,
          };
        } catch (err) {
          return {
            ...member,
            displayName: `Unknown (${member.discord_user_id})`,
          };
        }
      })
    );

    // Sort by role priority
    displayList.sort((a, b) => {
      const rolePriority = (user) => {
        if (user.discord_user_id === guild.owner_id) return 0;
        if (user.role === "officer") return 1;
        return 2;
      };

      return rolePriority(a) - rolePriority(b);
    });

    // Build embed description
    let description = "";
    for (const member of displayList) {
      const emoji =
        member.discord_user_id === guild.owner_id
          ? "👑"
          : member.role === "officer"
          ? "⭐"
          : "👤";
      description += `${emoji} **${member.displayName}** – ${member.role}\n`;
    }

    const embed = new EmbedBuilder()
      .setTitle(`${guild.name} – Admin Panel`)
      .setDescription(description || "No members found.")
      .setColor("#2ecc71");

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};
